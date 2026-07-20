.PHONY: setup db-up db-down run-api run-web clean

# İlk kurulum
setup:
	@echo "Frontend bağımlılıkları kuruluyor..."
	cd apps/web-app && npm install
	@echo "Go modülleri indiriliyor..."
	cd apps/go-backend && go mod tidy

# Veritabanını ayağa kaldır (Arka planda)
db-up:
	docker-compose up -d

# Veritabanını durdur
db-down:
	docker-compose down

# Sadece Go Backend'i çalıştır
run-api:
	cd apps/go-backend && go run main.go

# Sadece Next.js Frontend'i çalıştır
run-web:
	cd apps/web-app && npm run dev

# Temizlik
clean:
	docker-compose down -v
	rm -rf apps/web-app/node_modules
	rm -rf apps/web-app/.next
