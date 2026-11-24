package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/config"
	"github.com/mohef-tech/mohef-pos/backend/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type TransactionController struct {
	DB *gorm.DB
}

func NewTransactionController(db *gorm.DB) *TransactionController {
	return &TransactionController{DB: db}
}

func (tc *TransactionController) db() *gorm.DB {
	if tc.DB != nil {
		return tc.DB
	}
	return config.DB
}

type TransactionItemInput struct {
	ProductVariantID uint    `json:"product_variant_id" binding:"required"`
	Quantity         float64 `json:"quantity" binding:"required,gt=0"`
}

type CreateTransactionRequest struct {
	SessionID     uint                   `json:"session_id"`
	PaymentMethod string                 `json:"payment_method" binding:"required"`
	Items         []TransactionItemInput `json:"items" binding:"required,min=1,dive"`
}

func (tc *TransactionController) CreateTransaction(c *gin.Context) {
	var req CreateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload transaksi tidak valid, pastikan payment_method dan minimal 1 item terisi"})
		return
	}

	paymentMethod := strings.ToLower(strings.TrimSpace(req.PaymentMethod))
	if paymentMethod != models.PaymentMethodCash && paymentMethod != models.PaymentMethodQRIS {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment_method tidak valid, gunakan 'cash' atau 'qris'"})
		return
	}

	db := tc.db()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database belum siap"})
		return
	}

	userID := c.GetUint("user_id")
	businessID := c.GetUint("business_id")

	tx := db.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memulai transaksi database"})
		return
	}

	sessionQuery := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("business_id = ? AND user_id = ? AND status = ?", businessID, userID, models.SessionStatusOpen)
	if req.SessionID > 0 {
		sessionQuery = sessionQuery.Where("id = ?", req.SessionID)
	}

	var session models.CashierSession
	if err := sessionQuery.First(&session).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "sesi kasir aktif tidak ditemukan, buka sesi terlebih dahulu"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memeriksa sesi kasir"})
		return
	}

	variantMap := make(map[uint]models.ProductVariant, len(req.Items))
	productIDSet := make(map[uint]struct{}, len(req.Items))
	for _, item := range req.Items {
		if _, exists := variantMap[item.ProductVariantID]; exists {
			continue
		}
		var variant models.ProductVariant
		if err := tx.First(&variant, item.ProductVariantID).Error; err != nil {
			tx.Rollback()
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "varian produk tidak ditemukan"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil data varian produk"})
			return
		}
		variantMap[variant.ID] = variant
		productIDSet[variant.ProductID] = struct{}{}
	}

	// Lock products in deterministic ID order to avoid deadlocks under concurrent checkouts.
	productIDs := make([]uint, 0, len(productIDSet))
	for id := range productIDSet {
		productIDs = append(productIDs, id)
	}
	sort.Slice(productIDs, func(i, j int) bool { return productIDs[i] < productIDs[j] })

	lockedProducts := make(map[uint]*models.Product, len(productIDs))
	for _, productID := range productIDs {
		var product models.Product
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND business_id = ?", productID, businessID).
			First(&product).Error
		if err != nil {
			tx.Rollback()
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "produk tidak ditemukan"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengunci data produk"})
			return
		}
		lockedProducts[product.ID] = &product
	}

	var totalAmount float64
	txItems := make([]models.TransactionItem, 0, len(req.Items))
	stockDeductions := make(map[uint]float64, len(productIDs))

	for _, item := range req.Items {
		variant := variantMap[item.ProductVariantID]
		product := lockedProducts[variant.ProductID]

		requiredBaseStock := item.Quantity * variant.ConversionRate
		if requiredBaseStock > product.BaseStock {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Stok tidak mencukupi"})
			return
		}

		product.BaseStock -= requiredBaseStock
		stockDeductions[product.ID] += requiredBaseStock

		subtotal := item.Quantity * variant.Price
		totalAmount += subtotal

		txItems = append(txItems, models.TransactionItem{
			ProductVariantID: variant.ID,
			Quantity:         item.Quantity,
			PriceAtTime:      variant.Price,
			Subtotal:         subtotal,
		})
	}

	for _, productID := range productIDs {
		product := lockedProducts[productID]
		if err := tx.Model(product).Update("base_stock", product.BaseStock).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memperbarui stok produk"})
			return
		}
	}

	now := time.Now()
	status := models.TransactionStatusPaid
	if paymentMethod == models.PaymentMethodQRIS {
		status = models.TransactionStatusPending
	}

	transaction := models.Transaction{
		BusinessID:    businessID,
		SessionID:     session.ID,
		ReceiptNumber: fmt.Sprintf("INV-%s-%d-%04d", now.Format("20060102150405"), session.ID, now.UnixNano()%10000),
		TotalAmount:   totalAmount,
		PaymentMethod: paymentMethod,
		Status:        status,
	}

	if err := tx.Create(&transaction).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan transaksi"})
		return
	}

	for i := range txItems {
		txItems[i].TransactionID = transaction.ID
	}
	if err := tx.Create(&txItems).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan detail item transaksi"})
		return
	}

	txRefID := transaction.ID
	movements := make([]models.StockMovement, 0, len(productIDs))
	for _, productID := range productIDs {
		deducted := stockDeductions[productID]
		if deducted <= 0 {
			continue
		}
		movements = append(movements, models.StockMovement{
			BusinessID:   businessID,
			ProductID:    productID,
			UserID:       userID,
			MovementType: models.StockMovementSale,
			Quantity:     -deducted,
			Reason:       "Penjualan " + transaction.ReceiptNumber,
			ReferenceID:  &txRefID,
		})
	}
	if len(movements) > 0 {
		if err := tx.Create(&movements).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mencatat pergerakan stok penjualan"})
			return
		}
	}

	if paymentMethod == models.PaymentMethodCash {
		session.ExpectedCash += totalAmount
		if err := tx.Model(&session).Update("expected_cash", session.ExpectedCash).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memperbarui saldo kas sesi"})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyelesaikan transaksi"})
		return
	}

	transaction.Items = txItems
	c.JSON(http.StatusCreated, gin.H{"data": transaction})
}
