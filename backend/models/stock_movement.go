package models

import "time"

const (
	StockMovementIn         = "in"
	StockMovementSale       = "sale"
	StockMovementReturn     = "return"
	StockMovementAdjustment = "adjustment"
)

type StockMovement struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	BusinessID   uint      `gorm:"not null;default:1;index" json:"business_id"`
	ProductID    uint      `gorm:"not null;index" json:"product_id"`
	Product      Product   `gorm:"foreignKey:ProductID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"product,omitempty"`
	UserID       uint      `gorm:"not null;index" json:"user_id"`
	User         User      `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"user,omitempty"`
	MovementType string    `gorm:"type:varchar(30);not null;index" json:"movement_type"`
	Quantity     float64   `gorm:"type:numeric(14,4);not null" json:"quantity"`
	Reason       string    `gorm:"type:varchar(255)" json:"reason"`
	ReferenceID  *uint     `gorm:"index" json:"reference_id,omitempty"`
	CreatedAt    time.Time `gorm:"index" json:"created_at"`
}
