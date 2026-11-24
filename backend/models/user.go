package models

import "time"

const (
	RoleOwner   = "owner"
	RoleCashier = "cashier"
)

type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	BusinessID   uint      `gorm:"not null;default:1;index" json:"business_id"`
	Name         string    `gorm:"type:varchar(100);not null" json:"name"`
	Email        string    `gorm:"type:varchar(150);index" json:"email,omitempty"`
	Username     string    `gorm:"type:varchar(100);index" json:"username,omitempty"`
	PasswordHash string    `gorm:"type:varchar(255)" json:"-"`
	PinCode      string    `gorm:"type:varchar(255)" json:"-"`
	Role         string    `gorm:"type:varchar(20);not null" json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
