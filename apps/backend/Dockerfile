# 1. Aşama: Derleme (Build Stage - En güncel Go Alpine)
FROM golang:alpine AS builder

WORKDIR /app

# Bağımlılık dosyalarını kopyala ve indir
COPY go.mod go.sum ./
RUN go mod download

# Kaynak kodları kopyala ve derle
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# 2. Aşama: Çalıştırma (Runtime Stage)
FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]
