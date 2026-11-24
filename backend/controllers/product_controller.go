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

type ProductController struct {
	DB *gorm.DB
}

func NewProductController(db *gorm.DB) *ProductController {
	return &ProductController{DB: db}
}

func (pc *ProductController) db() *gorm.DB {
	if pc.DB != nil {
		return pc.DB
	}
	return config.DB
}

type ProductVariantInput struct {
	VariantName    string  `json:"variant_name" binding:"required"`
	ConversionRate float64 `json:"conversion_rate" binding:"required,gt=0"`
	Price          float64 `json:"price" binding:"required,gte=0"`
	Barcode        string  `json:"barcode"`
}

type CreateProductRequest struct {
	Name      string                `json:"name" binding:"required"`
	BaseStock float64               `json:"base_stock" binding:"gte=0"`
	Variants  []ProductVariantInput `json:"variants" binding:"required,min=1,dive"`
}

type AdjustStockRequest struct {
	ProductID uint    `json:"product_id" binding:"required"`
	Quantity  float64 `json:"quantity" binding:"required"`
	Reason    string  `json:"reason" binding:"required"`
}

func (pc *ProductController) CreateProduct(c *gin.Context) {
	if c.GetString("role") != models.RoleOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "hanya owner yang dapat menambahkan produk"})
		return
	}

	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload produk tidak valid, pastikan nama dan minimal 1 varian terisi"})
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nama produk wajib diisi"})
		return
	}

	db := pc.db()
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

	product := models.Product{
		BusinessID: businessID,
		Name:       name,
		BaseStock:  req.BaseStock,
	}
	if err := tx.Create(&product).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan produk"})
		return
	}

	variants := make([]models.ProductVariant, 0, len(req.Variants))
	for _, v := range req.Variants {
		variantName := strings.TrimSpace(v.VariantName)
		if variantName == "" {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "nama varian wajib diisi"})
			return
		}
		variants = append(variants, models.ProductVariant{
			ProductID:      product.ID,
			VariantName:    variantName,
			ConversionRate: v.ConversionRate,
			Price:          v.Price,
			Barcode:        strings.TrimSpace(v.Barcode),
		})
	}

	if err := tx.Create(&variants).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan varian kemasan"})
		return
	}

	if req.BaseStock > 0 {
		movement := models.StockMovement{
			BusinessID:   businessID,
			ProductID:    product.ID,
			UserID:       userID,
			MovementType: models.StockMovementIn,
			Quantity:     req.BaseStock,
			Reason:       "Stok awal produk",
		}
		if err := tx.Create(&movement).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mencatat stok awal"})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyelesaikan transaksi produk"})
		return
	}

	product.Variants = variants
	c.JSON(http.StatusCreated, gin.H{"data": product})
}

func (pc *ProductController) GetProducts(c *gin.Context) {
	db := pc.db()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database belum siap"})
		return
	}

	businessID := c.GetUint("business_id")
	var products []models.Product
	if err := db.Where("business_id = ?", businessID).
		Preload("Variants").
		Order("id ASC").
		Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil daftar produk"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": products})
}

func (pc *ProductController) AdjustStock(c *gin.Context) {
	if c.GetString("role") != models.RoleOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "hanya owner yang dapat menyesuaikan stok"})
		return
	}

	var req AdjustStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "product_id, quantity, dan reason wajib diisi"})
		return
	}

	reason := strings.TrimSpace(req.Reason)
	if reason == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "alasan penyesuaian stok wajib diisi"})
		return
	}

	db := pc.db()
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

	var product models.Product
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND business_id = ?", req.ProductID, businessID).
		First(&product).Error
	if err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "produk tidak ditemukan"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil data produk"})
		return
	}

	newStock := product.BaseStock + req.Quantity
	if newStock < 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "stok tidak boleh kurang dari nol"})
		return
	}

	if err := tx.Model(&product).Update("base_stock", newStock).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memperbarui stok produk"})
		return
	}
	product.BaseStock = newStock

	movement := models.StockMovement{
		BusinessID:   businessID,
		ProductID:    product.ID,
		UserID:       userID,
		MovementType: models.StockMovementAdjustment,
		Quantity:     req.Quantity,
		Reason:       reason,
	}
	if err := tx.Create(&movement).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mencatat riwayat pergerakan stok"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyelesaikan transaksi penyesuaian stok"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"product":  product,
		"movement": movement,
	})
}
