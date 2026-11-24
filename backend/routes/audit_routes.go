package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/config"
	"github.com/mohef-tech/mohef-pos/backend/controllers"
	"github.com/mohef-tech/mohef-pos/backend/utils"
)

func AuditRoutes(r *gin.Engine) {
	auditController := controllers.NewAuditController(config.DB)

	auditGroup := r.Group("/api/audits")
	auditGroup.Use(utils.AuthMiddleware())
	{
		auditGroup.POST("/print", auditController.LogPrintReceipt)
	}
}
