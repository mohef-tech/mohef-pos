package controllers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/config"
	"github.com/mohef-tech/mohef-pos/backend/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ReturnController struct {
	DB *gorm.DB
}

func NewReturnController(db *gorm.DB) *ReturnController {
	return &ReturnController{DB: db}
}

func (rc *ReturnController) db() *gorm.DB {
	if rc.DB != nil {
		return rc.DB
	}
	return config.DB
}

type CreateReturnRequest struct {
	TransactionID    uint    `json:"transaction_id" binding:"required"`
	ProductVariantID uint    `json:"product_variant_id" binding:"required"`
	Quantity         float64 `json:"quantity" binding:"required,gt=0"`
	Condition        string  `json:"condition" binding:"required"`
	Reason           string  `json:"reason"`
}

func (rc *ReturnController) CreateReturn(c *gin.Context) {
	if c.GetString("role") != models.RoleOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "hanya owner yang dapat memproses retur"})
		return
	}

	var req CreateReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "transaction_id, product_variant_id, quantity, dan condition wajib diisi"})
		return
	}

	rawCondition := strings.ToLower(strings.TrimSpace(req.Condition))
	var normalizedCondition string
	var isResellable bool
	switch rawCondition {
	case "layak_jual", models.ReturnConditionResellable:
		normalizedCondition = models.ReturnConditionResellable
		isResellable = true
	case "rusak", models.ReturnConditionDamaged:
		normalizedCondition = models.ReturnConditionDamaged
		isResellable = false
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "condition tidak valid, gunakan 'layak_jual' atau 'rusak'"})
		return
	}

	reason := strings.TrimSpace(req.Reason)
	if reason == "" {
		reason = "Retur barang (" + rawCondition + ")"
	}

	db := rc.db()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database belum siap"})
		return
	}

	businessID := c.GetUint("business_id")
	userID := c.GetUint("user_id")

	tx := db.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memulai transaksi database"})
		return
	}

	var transaction models.Transaction
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND business_id = ?", req.TransactionID, businessID).
		First(&transaction).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "transaksi asal tidak ditemukan"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil data transaksi"})
		return
	}

	var txItem models.TransactionItem
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("transaction_id = ? AND product_variant_id = ?", transaction.ID, req.ProductVariantID).
		First(&txItem).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "item varian produk tidak ditemukan pada transaksi tersebut"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil item transaksi"})
		return
	}

	var returnedQty float64
	if err := tx.Model(&models.ReturnItem{}).
		Where("transaction_item_id = ?", txItem.ID).
		Select("COALESCE(SUM(quantity), 0)").
		Scan(&returnedQty).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memeriksa riwayat retur item"})
		return
	}

	if req.Quantity > (txItem.Quantity - returnedQty) {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "jumlah retur melebihi sisa kuantitas pembelian"})
		return
	}

	var variant models.ProductVariant
	if err := tx.First(&variant, req.ProductVariantID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil data varian produk"})
		return
	}

	refundAmount := req.Quantity * txItem.PriceAtTime

	newSubtotal := txItem.Subtotal - refundAmount
	if newSubtotal < 0 {
		newSubtotal = 0
	}
	if err := tx.Model(&txItem).Update("subtotal", newSubtotal).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memperbarui subtotal item transaksi"})
		return
	}

	newTotal := transaction.TotalAmount - refundAmount
	if newTotal < 0 {
		newTotal = 0
	}
	txUpdates := map[string]any{"total_amount": newTotal}
	if newTotal == 0 {
		txUpdates["status"] = models.TransactionStatusRefunded
	}
	if err := tx.Model(&transaction).Updates(txUpdates).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memperbarui total transaksi"})
		return
	}

	ret := models.Return{
		BusinessID:    businessID,
		TransactionID: transaction.ID,
		UserID:        userID,
		Reason:        reason,
		TotalRefund:   refundAmount,
	}
	if err := tx.Create(&ret).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan data retur"})
		return
	}

	retItem := models.ReturnItem{
		ReturnID:          ret.ID,
		TransactionItemID: txItem.ID,
		ProductVariantID:  variant.ID,
		Quantity:          req.Quantity,
		Condition:         normalizedCondition,
		RefundAmount:      refundAmount,
	}
	if err := tx.Create(&retItem).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan detail retur"})
		return
	}

	if isResellable {
		var product models.Product
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND business_id = ?", variant.ProductID, businessID).
			First(&product).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengunci data produk"})
			return
		}

		restoredStock := req.Quantity * variant.ConversionRate
		product.BaseStock += restoredStock
		if err := tx.Model(&product).Update("base_stock", product.BaseStock).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengembalikan stok produk"})
			return
		}

		refID := ret.ID
		movement := models.StockMovement{
			BusinessID:   businessID,
			ProductID:    product.ID,
			UserID:       userID,
			MovementType: models.StockMovementReturn,
			Quantity:     restoredStock,
			Reason:       "Retur layak jual: " + reason,
			ReferenceID:  &refID,
		}
		if err := tx.Create(&movement).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mencatat pergerakan stok retur"})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyelesaikan transaksi retur"})
		return
	}

	ret.Items = []models.ReturnItem{retItem}
	c.JSON(http.StatusCreated, gin.H{"data": ret})
}
