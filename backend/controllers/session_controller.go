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

type SessionController struct {
	DB *gorm.DB
}

func NewSessionController(db *gorm.DB) *SessionController {
	return &SessionController{DB: db}
}

func (sc *SessionController) db() *gorm.DB {
	if sc.DB != nil {
		return sc.DB
	}
	return config.DB
}

type OpenSessionRequest struct {
	StartingCash float64 `json:"starting_cash" binding:"gte=0"`
}

type CloseSessionRequest struct {
	SessionID  uint    `json:"session_id"`
	ActualCash float64 `json:"actual_cash" binding:"gte=0"`
}

func (sc *SessionController) OpenSession(c *gin.Context) {
	var req OpenSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "starting_cash tidak valid, minimal 0"})
		return
	}

	db := sc.db()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database belum siap"})
		return
	}

	userID := c.GetUint("user_id")
	businessID := c.GetUint("business_id")

	var activeCount int64
	if err := db.Model(&models.CashierSession{}).
		Where("business_id = ? AND user_id = ? AND status = ?", businessID, userID, models.SessionStatusOpen).
		Count(&activeCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memeriksa sesi aktif"})
		return
	}
	if activeCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "akun ini masih memiliki sesi kasir yang aktif"})
		return
	}

	session := models.CashierSession{
		BusinessID:   businessID,
		UserID:       userID,
		StartTime:    time.Now(),
		StartingCash: req.StartingCash,
		ExpectedCash: req.StartingCash,
		ActualCash:   0,
		Status:       models.SessionStatusOpen,
	}

	if err := db.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membuka sesi kasir"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": session})
}

func (sc *SessionController) CloseSession(c *gin.Context) {
	var req CloseSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "actual_cash tidak valid, minimal 0"})
		return
	}

	db := sc.db()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database belum siap"})
		return
	}

	userID := c.GetUint("user_id")
	businessID := c.GetUint("business_id")
	role := c.GetString("role")

	tx := db.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memulai transaksi database"})
		return
	}

	query := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("business_id = ? AND status = ?", businessID, models.SessionStatusOpen)
	if req.SessionID > 0 {
		query = query.Where("id = ?", req.SessionID)
		if role != models.RoleOwner {
			query = query.Where("user_id = ?", userID)
		}
	} else {
		query = query.Where("user_id = ?", userID)
	}

	var session models.CashierSession
	if err := query.First(&session).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "sesi kasir aktif tidak ditemukan"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil data sesi kasir"})
		return
	}

	var cashSales float64
	if err := tx.Model(&models.Transaction{}).
		Where("business_id = ? AND session_id = ? AND payment_method = ? AND status = ?", businessID, session.ID, models.PaymentMethodCash, models.TransactionStatusPaid).
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&cashSales).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menghitung total penjualan tunai"})
		return
	}

	var qrisSales float64
	if err := tx.Model(&models.Transaction{}).
		Where("business_id = ? AND session_id = ? AND payment_method = ? AND status = ?", businessID, session.ID, models.PaymentMethodQRIS, models.TransactionStatusPaid).
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&qrisSales).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menghitung total penjualan QRIS"})
		return
	}

	var totalRefunds float64
	if err := tx.Model(&models.Return{}).
		Joins("JOIN transactions ON transactions.id = returns.transaction_id").
		Where("returns.business_id = ? AND transactions.session_id = ?", businessID, session.ID).
		Select("COALESCE(SUM(returns.total_refund), 0)").
		Scan(&totalRefunds).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menghitung total pengembalian tunai"})
		return
	}

	now := time.Now()
	session.EndTime = &now
	session.ActualCash = req.ActualCash
	session.Status = models.SessionStatusClosed

	if err := tx.Save(&session).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menutup sesi kasir"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan penutupan sesi kasir"})
		return
	}

	difference := session.ActualCash - session.ExpectedCash

	c.JSON(http.StatusOK, gin.H{
		"data": session,
		"summary": gin.H{
			"starting_cash": session.StartingCash,
			"cash_sales":    cashSales,
			"qris_sales":    qrisSales,
			"total_refunds": totalRefunds,
			"expected_cash": session.ExpectedCash,
			"actual_cash":   session.ActualCash,
			"difference":    difference,
		},
	})
}
