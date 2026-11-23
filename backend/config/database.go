package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/mohef-tech/mohef-pos/backend/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

const defaultDSN = "host=localhost user=pos_admin password=pos1606 dbname=mohef_pos_db port=5432 sslmode=disable TimeZone=Asia/Jakarta"

var DB *gorm.DB

func ResolveDSN() string {
	if dsn := strings.TrimSpace(os.Getenv("DATABASE_URL")); dsn != "" {
		return dsn
	}

	host := strings.TrimSpace(os.Getenv("DB_HOST"))
	user := strings.TrimSpace(os.Getenv("DB_USER"))
	password := os.Getenv("DB_PASSWORD")
	dbName := strings.TrimSpace(os.Getenv("DB_NAME"))
	port := strings.TrimSpace(os.Getenv("DB_PORT"))
	sslMode := strings.TrimSpace(os.Getenv("DB_SSLMODE"))
	timeZone := strings.TrimSpace(os.Getenv("DB_TIMEZONE"))

	if host == "" && user == "" && password == "" && dbName == "" && port == "" && sslMode == "" && timeZone == "" {
		return defaultDSN
	}

	if host == "" {
		host = "localhost"
	}
	if user == "" {
		user = "pos_admin"
	}
	if password == "" {
		password = "pos1606"
	}
	if dbName == "" {
		dbName = "mohef_pos_db"
	}
	if port == "" {
		port = "5432"
	}
	if sslMode == "" {
		sslMode = "disable"
	}
	if timeZone == "" {
		timeZone = "Asia/Jakarta"
	}

	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		host, user, password, dbName, port, sslMode, timeZone,
	)
}

func ConnectDB() (*gorm.DB, error) {
	dsn := ResolveDSN()

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	if err := db.AutoMigrate(
		&models.User{},
		&models.Product{},
		&models.ProductVariant{},
		&models.CashierSession{},
		&models.Transaction{},
		&models.TransactionItem{},
	); err != nil {
		return nil, fmt.Errorf("failed to run auto-migrate: %w", err)
	}

	DB = db
	return db, nil
}
