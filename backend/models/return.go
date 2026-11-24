package models

import "time"

const (
	ReturnConditionResellable = "resellable"
	ReturnConditionDamaged    = "damaged"
)

type Return struct {
	ID            uint         `gorm:"primaryKey" json:"id"`
	BusinessID    uint         `gorm:"not null;default:1;index" json:"business_id"`
	TransactionID uint         `gorm:"not null;index" json:"transaction_id"`
	Transaction   Transaction  `gorm:"foreignKey:TransactionID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"transaction,omitempty"`
	UserID        uint         `gorm:"not null;index" json:"user_id"`
	User          User         `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"user,omitempty"`
	Reason        string       `gorm:"type:varchar(255);not null" json:"reason"`
	TotalRefund   float64      `gorm:"type:numeric(14,2);not null;default:0" json:"total_refund"`
	Items         []ReturnItem `gorm:"foreignKey:ReturnID" json:"items,omitempty"`
	CreatedAt     time.Time    `gorm:"index" json:"created_at"`
}

type ReturnItem struct {
	ID                uint            `gorm:"primaryKey" json:"id"`
	ReturnID          uint            `gorm:"not null;index" json:"return_id"`
	Return            Return          `gorm:"foreignKey:ReturnID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	TransactionItemID uint            `gorm:"not null;index" json:"transaction_item_id"`
	TransactionItem   TransactionItem `gorm:"foreignKey:TransactionItemID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"transaction_item,omitempty"`
	ProductVariantID  uint            `gorm:"not null;index" json:"product_variant_id"`
	ProductVariant    ProductVariant  `gorm:"foreignKey:ProductVariantID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"product_variant,omitempty"`
	Quantity          float64         `gorm:"type:numeric(14,4);not null" json:"quantity"`
	Condition         string          `gorm:"type:varchar(20);not null" json:"condition"`
	RefundAmount      float64         `gorm:"type:numeric(14,2);not null" json:"refund_amount"`
}
