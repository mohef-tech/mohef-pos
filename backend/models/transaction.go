package models

import "time"

const (
	PaymentMethodCash = "cash"
	PaymentMethodQRIS = "qris"

	TransactionStatusPaid     = "paid"
	TransactionStatusRefunded = "refunded"
	TransactionStatusPending  = "pending"
)

type Transaction struct {
	ID            uint              `gorm:"primaryKey" json:"id"`
	SessionID     uint              `gorm:"not null;index" json:"session_id"`
	Session       CashierSession    `gorm:"foreignKey:SessionID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"session,omitempty"`
	ReceiptNumber string            `gorm:"type:varchar(64);not null;uniqueIndex" json:"receipt_number"`
	TotalAmount   float64           `gorm:"type:numeric(14,2);not null" json:"total_amount"`
	PaymentMethod string            `gorm:"type:varchar(20);not null" json:"payment_method"`
	Status        string            `gorm:"type:varchar(20);not null;index" json:"status"`
	Items         []TransactionItem `gorm:"foreignKey:TransactionID" json:"items,omitempty"`
	CreatedAt     time.Time         `gorm:"index" json:"created_at"`
}

type TransactionItem struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	TransactionID    uint           `gorm:"not null;index" json:"transaction_id"`
	Transaction      Transaction    `gorm:"foreignKey:TransactionID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	ProductVariantID uint           `gorm:"not null;index" json:"product_variant_id"`
	ProductVariant   ProductVariant `gorm:"foreignKey:ProductVariantID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"product_variant,omitempty"`
	Quantity         float64        `gorm:"type:numeric(14,4);not null" json:"quantity"`
	PriceAtTime      float64        `gorm:"type:numeric(14,2);not null" json:"price_at_time"`
	Subtotal         float64        `gorm:"type:numeric(14,2);not null" json:"subtotal"`
}
