package main

import (
	"github.com/gin-gonic/gin"

	"stagepartner/backend/config"
	"stagepartner/backend/models"
	"stagepartner/backend/routes"
)

func main() {
	config.InitJWT()
	config.ConnectDatabase()
	config.DB.AutoMigrate(&models.LlmLog{}, &models.User{})

	r := gin.Default()
	routes.Setup(r)

	r.Run(":8080")
}
