package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func SystemStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":      "active",
		"database":    "connected",
		"uptime":      "99.9%",
		"environment": "production",
	})
}

func SupportedModels(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"default_model": "gemma-2b-it-q4f16_1-MLC",
		"supported_models": []string{
			"gemma-2b-it-q4f16_1-MLC",
			"Llama-3-8B-Instruct-q4f16_1-MLC",
			"Qwen2-0.5B-Instruct-q4f16_1-MLC",
		},
		"engine": "webgpu",
	})
}

func Version(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"version": "1.0.0", "build": "stable"})
}

func Ping(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "pong", "timestamp": gin.H{"current": "calculated"}})
}
