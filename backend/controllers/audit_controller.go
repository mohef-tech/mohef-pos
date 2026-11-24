package controllers

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/config"
	"github.com/mohef-tech/mohef-pos/backend/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AuditController struct {
	DB *gorm.DB
}

func NewAuditController(db *gorm.DB) *AuditController {
	return &AuditController{DB: db}
}

func (ac *AuditController) db() *gorm.DB {
	if ac.DB != nil {
		return ac.DB
	}
	return config.DB
}

type LogPrintReceiptRequest struct {
	TransactionID uint `json:"transaction_id" binding:"required"`
}

func (ac *AuditController) LogPrintReceipt(c *gin.Context) {
	var req LogPrintReceiptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "transaction_id wajib diisi"})
		return
	}

	db := ac.db()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database belum siap"})
		return
	}

	businessID := c.GetUint("business_id")
	userID := c.GetUint("user_id")
	role := c.GetString("role")

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
			c.JSON(http.StatusNotFound, gin.H{"error": "transaksi tidak ditemukan"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memeriksa transaksi"})
		return
	}

	var printCount int64
	if err := tx.Model(&models.PrintAudit{}).
		Where("business_id = ? AND transaction_id = ?", businessID, transaction.ID).
		Count(&printCount).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menghitung riwayat cetak struk"})
		return
	}

	if role == models.RoleCashier && printCount >= 3 {
		tx.Rollback()
		c.JSON(http.StatusForbidden, gin.H{"error": "Batas cetak kasir tercapai"})
		return
	}

	nextSequence := int(printCount) + 1
	isCopy := nextSequence > 1

	audit := models.PrintAudit{
		BusinessID:    businessID,
		TransactionID: transaction.ID,
		UserID:        userID,
		PrintSequence: nextSequence,
		IsCopy:        isCopy,
		PrintedAt:     time.Now(),
	}
	if err := tx.Create(&audit).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan log cetak struk"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyelesaikan log cetak struk"})
		return
	}

	watermark := ""
	if isCopy {
		watermark = "SALINAN"
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":      audit,
		"watermark": watermark,
	})
}
