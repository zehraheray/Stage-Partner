package models

import (
	"time"
	"gorm.io/gorm"
)

type LlmLog struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Prompt    string         `gorm:"type:text;not null" json:"prompt"`
	Response  string         `gorm:"type:text;not null" json:"response"`
	LatencyMs int            `json:"latency_ms"`
	Score     int            `gorm:"default:0" json:"score"` // 1-5 arası Decision Score
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
