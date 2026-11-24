package main

import (
	"errors"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/config"
	"github.com/mohef-tech/mohef-pos/backend/models"
	"github.com/mohef-tech/mohef-pos/backend/routes"
	"gorm.io/gorm"
)

func parseAllowedOrigins(raw string) map[string]struct{} {
	allowed := make(map[string]struct{})
	for _, part := range strings.Split(raw, ",") {
		origin := strings.TrimSpace(part)
		if origin != "" {
			allowed[origin] = struct{}{}
		}
	}
	return allowed
}

func corsMiddleware(allowedOrigins map[string]struct{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if _, ok := allowedOrigins[origin]; ok {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func setupRouter(db *gorm.DB, allowedOrigins map[string]struct{}) *gin.Engine {
	r := gin.Default()
	r.Use(corsMiddleware(allowedOrigins))

	r.GET("/health", func(c *gin.Context) {
		if db == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "error", "database": "uninitialized"})
			return
		}
		sqlDB, err := db.DB()
		if err != nil || sqlDB.Ping() != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "error", "database": "unreachable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok", "database": "connected"})
	})

	routes.RegisterAuthRoutes(r, db)
	routes.ProductRoutes(r)
	routes.SessionRoutes(r)
	routes.TransactionRoutes(r)
	routes.ReturnRoutes(r)
	routes.AuditRoutes(r)
	routes.ReportRoutes(r)

	return r
}

func migrateDatabase(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.User{},
		&models.Product{},
		&models.ProductVariant{},
		&models.CashierSession{},
		&models.Transaction{},
		&models.TransactionItem{},
		&models.StockMovement{},
		&models.Return{},
		&models.ReturnItem{},
		&models.PrintAudit{},
	)
}

func getEnvOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func main() {
	db, err := config.ConnectDB()
	if err != nil {
		log.Fatalf("database initialization failed: %v", err)
	}

	if err := migrateDatabase(db); err != nil {
		log.Fatalf("database auto-migrate failed: %v", err)
	}

	if gin.Mode() != gin.ReleaseMode {
		if err := config.SeedDevUsers(db); err != nil {
			log.Printf("warning: failed to seed dev users: %v", err)
		}
	}

	originsEnv := getEnvOrDefault("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
	r := setupRouter(db, parseAllowedOrigins(originsEnv))

	port := getEnvOrDefault("PORT", "8080")
	if err := r.Run(":" + port); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server failed: %v", err)
	}
}
