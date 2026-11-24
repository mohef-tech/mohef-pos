package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/config"
	"github.com/mohef-tech/mohef-pos/backend/controllers"
	"github.com/mohef-tech/mohef-pos/backend/utils"
)

func TransactionRoutes(r *gin.Engine) {
	transactionController := controllers.NewTransactionController(config.DB)

	transactionGroup := r.Group("/api/transactions")
	transactionGroup.Use(utils.AuthMiddleware())
	{
		transactionGroup.POST("", transactionController.CreateTransaction)
	}
}
