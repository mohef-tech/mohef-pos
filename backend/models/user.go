package models

import "time"

const (
	RoleOwner   = "owner"
	RoleCashier = "cashier"
)

type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name"`
	Role      string    `gorm:"type:varchar(20);not null" json:"role"`
	PinCode   string    `gorm:"type:varchar(255);not null" json:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
