package config

import (
	"fmt"
	"log"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	// Port 5433 olarak güncellendi
	dsn := "host=localhost user=admin password=secretpassword dbname=stage_partner port=5433 sslmode=disable TimeZone=UTC"
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Fatal("Veritabanına bağlanılamadı: ", err)
	}

	fmt.Println("PostgreSQL veritabanı bağlantısı başarılı!")
	DB = database
}
