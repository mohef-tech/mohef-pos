package models

import "time"

const (
	SessionStatusOpen   = "open"
	SessionStatusClosed = "closed"
)

type CashierSession struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	UserID       uint       `gorm:"not null;index" json:"user_id"`
	User         User       `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"user,omitempty"`
	StartTime    time.Time  `gorm:"not null" json:"start_time"`
	EndTime      *time.Time `json:"end_time"`
	StartingCash float64    `gorm:"type:numeric(14,2);not null;default:0" json:"starting_cash"`
	ExpectedCash float64    `gorm:"type:numeric(14,2);not null;default:0" json:"expected_cash"`
	ActualCash   float64    `gorm:"type:numeric(14,2);not null;default:0" json:"actual_cash"`
	Status       string     `gorm:"type:varchar(20);not null;default:'open';index" json:"status"`
}
