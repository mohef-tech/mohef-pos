package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/config"
	"github.com/mohef-tech/mohef-pos/backend/controllers"
	"github.com/mohef-tech/mohef-pos/backend/utils"
)

func SessionRoutes(r *gin.Engine) {
	sessionController := controllers.NewSessionController(config.DB)

	sessionGroup := r.Group("/api/sessions")
	sessionGroup.Use(utils.AuthMiddleware())
	{
		sessionGroup.POST("/open", sessionController.OpenSession)
		sessionGroup.POST("/close", sessionController.CloseSession)
	}
}
