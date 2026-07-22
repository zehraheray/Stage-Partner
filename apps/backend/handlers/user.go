package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"stagepartner/backend/config"
	"stagepartner/backend/models"
)

func GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kullanıcı bilgisi bulunamadı"})
		return
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kullanıcı bulunamadı"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}
