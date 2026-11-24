package config

import (
	"github.com/mohef-tech/mohef-pos/backend/models"
	"github.com/mohef-tech/mohef-pos/backend/utils"
	"gorm.io/gorm"
)

// shortcut: seed initial dev accounts only when users table is empty; replace with onboarding/CLI in production.
func SeedDevUsers(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.User{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	ownerPasswordHash, err := utils.HashSecret("owner123")
	if err != nil {
		return err
	}

	cashierPinHash, err := utils.HashSecret("123456")
	if err != nil {
		return err
	}

	defaultUsers := []models.User{
		{
			BusinessID:   1,
			Name:         "Pemilik Toko",
			Email:        "owner@moheftech.com",
			PasswordHash: ownerPasswordHash,
			Role:         models.RoleOwner,
		},
		{
			BusinessID: 1,
			Name:       "Kasir Utama",
			Username:   "kasir1",
			PinCode:    cashierPinHash,
			Role:       models.RoleCashier,
		},
	}

	return db.Create(&defaultUsers).Error
}
