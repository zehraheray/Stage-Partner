.PHONY: setup db-up db-down run-api run-web clean

# İlk kurulum
setup:
	@echo "Frontend bağımlılıkları kuruluyor..."
	cd apps/frontend && npm install
	@echo "Go modülleri indiriliyor..."
	cd apps/backend && go mod tidy

# Veritabanını ayağa kaldır (Arka planda)
db-up:
	docker compose up -d

# Veritabanını durdur
db-down:
	docker compose down

# Sadece Go Backend'i çalıştır
run-api:
	cd apps/backend && go run main.go

# Sadece Next.js Frontend'i çalıştır
run-web:
	cd apps/frontend && npm run dev

# Temizlik
clean:
	docker compose down -v
	rm -rf apps/frontend/node_modules
	rm -rf apps/frontend/.next
