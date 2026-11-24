package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/controllers"
	"gorm.io/gorm"
)

func RegisterAuthRoutes(r *gin.Engine, db *gorm.DB) {
	authController := controllers.NewAuthController(db)

	authGroup := r.Group("/api/auth")
	{
		authGroup.POST("/login", authController.Login)
	}
}
