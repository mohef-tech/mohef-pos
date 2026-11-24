package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/config"
	"github.com/mohef-tech/mohef-pos/backend/controllers"
	"github.com/mohef-tech/mohef-pos/backend/utils"
)

func ProductRoutes(r *gin.Engine) {
	productController := controllers.NewProductController(config.DB)

	productGroup := r.Group("/api/products")
	productGroup.Use(utils.AuthMiddleware())
	{
		productGroup.POST("", productController.CreateProduct)
		productGroup.GET("", productController.GetProducts)
		productGroup.POST("/adjust-stock", productController.AdjustStock)
	}
}
