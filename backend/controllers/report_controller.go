package controllers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/config"
	"github.com/mohef-tech/mohef-pos/backend/models"
	"gorm.io/gorm"
)

type ReportController struct {
	DB *gorm.DB
}

func NewReportController(db *gorm.DB) *ReportController {
	return &ReportController{DB: db}
}

func (rc *ReportController) db() *gorm.DB {
	if rc.DB != nil {
		return rc.DB
	}
	return config.DB
}

func (rc *ReportController) GetSalesReport(c *gin.Context) {
	if c.GetString("role") != models.RoleOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "hanya owner yang dapat mengakses laporan penjualan"})
		return
	}

	db := rc.db()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database belum siap"})
		return
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	startDateStr := strings.TrimSpace(c.Query("start_date"))
	endDateStr := strings.TrimSpace(c.Query("end_date"))

	startTime := today
	if startDateStr != "" {
		parsed, err := time.ParseInLocation("2006-01-02", startDateStr, now.Location())
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "format start_date harus YYYY-MM-DD"})
			return
		}
		startTime = parsed
	} else {
		startDateStr = today.Format("2006-01-02")
	}

	endDate := today
	if endDateStr != "" {
		parsed, err := time.ParseInLocation("2006-01-02", endDateStr, now.Location())
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "format end_date harus YYYY-MM-DD"})
			return
		}
		endDate = parsed
	} else {
		endDateStr = today.Format("2006-01-02")
	}

	endExclusive := endDate.AddDate(0, 0, 1)
	if !endExclusive.After(startTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_date tidak boleh lebih awal dari start_date"})
		return
	}

	businessID := c.GetUint("business_id")

	var transactions []models.Transaction
	if err := db.Where("business_id = ? AND created_at >= ? AND created_at < ?", businessID, startTime, endExclusive).
		Preload("Items").
		Order("created_at DESC").
		Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil laporan penjualan"})
		return
	}

	var totalRevenue float64
	var cashTotal float64
	var qrisTotal float64

	for _, t := range transactions {
		if t.Status != models.TransactionStatusPaid {
			continue
		}
		totalRevenue += t.TotalAmount
		switch t.PaymentMethod {
		case models.PaymentMethodCash:
			cashTotal += t.TotalAmount
		case models.PaymentMethodQRIS:
			qrisTotal += t.TotalAmount
		}
	}

	var totalReturns float64
	if err := db.Model(&models.Return{}).
		Where("business_id = ? AND created_at >= ? AND created_at < ?", businessID, startTime, endExclusive).
		Select("COALESCE(SUM(total_refund), 0)").
		Scan(&totalReturns).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menghitung total retur"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"period": gin.H{
			"start_date": startDateStr,
			"end_date":   endDateStr,
		},
		"summary": gin.H{
			"total_revenue":     totalRevenue,
			"cash_total":        cashTotal,
			"qris_total":        qrisTotal,
			"total_returns":     totalReturns,
			"transaction_count": len(transactions),
		},
		"transactions": transactions,
	})
}
