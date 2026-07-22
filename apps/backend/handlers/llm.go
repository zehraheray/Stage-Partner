package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"stagepartner/backend/config"
	"stagepartner/backend/models"
)

func CreateLog(c *gin.Context) {
	var input models.LlmLog
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := config.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Log kaydedilemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": input})
}

func GetLogs(c *gin.Context) {
	var logs []models.LlmLog
	if err := config.DB.Order("id desc").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Loglar getirilemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": logs})
}

func GetAnalytics(c *gin.Context) {
	type AnalyticsResult struct {
		TotalPrompts  int64   `json:"total_prompts"`
		AvgLatencyMs  float64 `json:"avg_latency_ms"`
		AvgScore      float64 `json:"avg_score"`
		ScoredPrompts int64   `json:"scored_prompts"`
	}

	var totalPrompts int64
	var scoredPrompts int64
	var avgLatency float64
	var avgScore float64

	if err := config.DB.Model(&models.LlmLog{}).Count(&totalPrompts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Analitik verileri alınamadı"})
		return
	}
	config.DB.Model(&models.LlmLog{}).Select("COALESCE(AVG(latency_ms), 0)").Scan(&avgLatency)
	config.DB.Model(&models.LlmLog{}).Where("score > 0").Count(&scoredPrompts)
	config.DB.Model(&models.LlmLog{}).Where("score > 0").Select("COALESCE(AVG(score), 0)").Scan(&avgScore)

	var topLogs []models.LlmLog
	config.DB.Order("score desc, id desc").Limit(5).Find(&topLogs)

	c.JSON(http.StatusOK, gin.H{
		"summary": AnalyticsResult{
			TotalPrompts:  totalPrompts,
			AvgLatencyMs:  avgLatency,
			AvgScore:      avgScore,
			ScoredPrompts: scoredPrompts,
		},
		"top_logs": topLogs,
	})
}

func ScoreDecision(c *gin.Context) {
	type ScoreInput struct {
		ID    uint `json:"id" binding:"required"`
		Score int  `json:"score" binding:"required"`
	}
	var input ScoreInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var logRecord models.LlmLog
	if err := config.DB.First(&logRecord, input.ID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kayıt bulunamadı"})
		return
	}

	if err := config.DB.Model(&logRecord).Update("score", input.Score).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Skor güncellenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Skor güncellendi", "data": logRecord})
}

func GetLog(c *gin.Context) {
	id := c.Param("id")
	var logItem models.LlmLog
	if err := config.DB.First(&logItem, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Log bulunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": logItem})
}

func ClearLogs(c *gin.Context) {
	if err := config.DB.Exec("DELETE FROM llm_logs").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Loglar temizlenemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Veritabanındaki tüm LLM logları temizlendi."})
}

func DeleteLog(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.LlmLog{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Log silinemedi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Log başarıyla silindi", "deleted_id": id})
}

func ExportLogs(c *gin.Context) {
	var logs []models.LlmLog
	if err := config.DB.Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Loglar dışa aktarılamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":        "Export hazır",
		"format":         "json",
		"total_exported": len(logs),
		"data":           logs,
	})
}
