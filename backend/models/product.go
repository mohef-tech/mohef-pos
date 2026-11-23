package models

import "time"

type Product struct {
	ID        uint             `gorm:"primaryKey" json:"id"`
	Name      string           `gorm:"type:varchar(150);not null;index" json:"name"`
	BaseStock float64          `gorm:"type:numeric(14,4);not null;default:0" json:"base_stock"`
	Variants  []ProductVariant `gorm:"foreignKey:ProductID" json:"variants,omitempty"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
}

type ProductVariant struct {
	ID             uint    `gorm:"primaryKey" json:"id"`
	ProductID      uint    `gorm:"not null;index" json:"product_id"`
	Product        Product `gorm:"foreignKey:ProductID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"product,omitempty"`
	VariantName    string  `gorm:"type:varchar(100);not null" json:"variant_name"`
	ConversionRate float64 `gorm:"type:numeric(14,4);not null;default:1" json:"conversion_rate"`
	Price          float64 `gorm:"type:numeric(14,2);not null" json:"price"`
	Barcode        string  `gorm:"type:varchar(100);index" json:"barcode"`
}
