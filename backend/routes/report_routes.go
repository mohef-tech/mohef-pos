package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/config"
	"github.com/mohef-tech/mohef-pos/backend/controllers"
	"github.com/mohef-tech/mohef-pos/backend/utils"
)

func ReportRoutes(r *gin.Engine) {
	reportController := controllers.NewReportController(config.DB)

	reportGroup := r.Group("/api/reports")
	reportGroup.Use(utils.AuthMiddleware())
	{
		reportGroup.GET("/sales", reportController.GetSalesReport)
	}
}
