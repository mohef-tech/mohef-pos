package models

import "time"

type PrintAudit struct {
	ID            uint        `gorm:"primaryKey" json:"id"`
	BusinessID    uint        `gorm:"not null;default:1;index" json:"business_id"`
	TransactionID uint        `gorm:"not null;index" json:"transaction_id"`
	Transaction   Transaction `gorm:"foreignKey:TransactionID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"transaction,omitempty"`
	UserID        uint        `gorm:"not null;index" json:"user_id"`
	User          User        `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"user,omitempty"`
	PrintSequence int         `gorm:"not null" json:"print_sequence"`
	IsCopy        bool        `gorm:"not null;default:false" json:"is_copy"`
	PrintedAt     time.Time   `gorm:"not null;index" json:"printed_at"`
}
