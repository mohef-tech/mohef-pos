package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/config"
	"github.com/mohef-tech/mohef-pos/backend/controllers"
	"github.com/mohef-tech/mohef-pos/backend/utils"
)

func ReturnRoutes(r *gin.Engine) {
	returnController := controllers.NewReturnController(config.DB)

	returnGroup := r.Group("/api/returns")
	returnGroup.Use(utils.AuthMiddleware())
	{
		returnGroup.POST("", returnController.CreateReturn)
	}
}
