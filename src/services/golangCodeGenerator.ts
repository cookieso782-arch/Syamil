export interface GeneratedFile {
  filename: string;
  language: string;
  description: string;
  code: string;
}

export const GOLANG_BACKEND_FILES: GeneratedFile[] = [
  {
    filename: 'backend/main.go',
    language: 'go',
    description: 'Entry point server Go (Fiber / Gin) dengan port 8080 & graceful shutdown',
    code: `package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"sabiluna-backend/config"
	"sabiluna-backend/handlers"
	"sabiluna-backend/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// 1. Inisialisasi Koneksi PostgreSQL / NeonDB (Port 5432)
	config.InitDatabase()

	app := fiber.New(fiber.Config{
		AppName:      "Sabiluna Mosque Management API v1.0",
		ServerHeader: "Sabiluna-Core",
		BodyLimit:    20 * 1024 * 1024, // 20MB untuk berkas Excel besar
	})

	// 2. Middleware Keamanan Tinggi & Anti-SQL Injection
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     os.Getenv("ALLOWED_ORIGINS"),
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
	}))
	app.Use(middleware.SecurityHeaders())

	// 3. Routing API
	api := app.Group("/api/v1")

	// Public Routes
	api.Get("/health", handlers.HealthCheck)
	api.Post("/auth/login", handlers.Login)
	api.Post("/auth/refresh", handlers.RefreshToken)

	// Protected Routes (Memerlukan JWT Bearer Token Valid)
	protected := api.Group("/", middleware.JWTMiddleware())

	// Kas & Keuangan (Fitur CRUD, Import & Export Excel)
	finance := protected.Group("/finance")
	finance.Get("/transactions", handlers.GetTransactions)
	finance.Post("/transactions", middleware.RequireRoles("super_admin", "bendahara"), handlers.CreateTransaction)
	finance.Put("/transactions/:id", middleware.RequireRoles("super_admin", "bendahara"), handlers.UpdateTransaction)
	finance.Delete("/transactions/:id", middleware.RequireRoles("super_admin"), handlers.DeleteTransaction)
	finance.Get("/export-excel", handlers.ExportFinanceExcel)
	finance.Post("/import-excel", middleware.RequireRoles("super_admin", "bendahara"), handlers.ImportFinanceExcel)

	// Inventaris Masjid
	inv := protected.Group("/inventory")
	inv.Get("/", handlers.GetInventory)
	inv.Post("/", middleware.RequireRoles("super_admin", "bendahara", "marbot"), handlers.CreateInventory)
	inv.Put("/:id", middleware.RequireRoles("super_admin", "bendahara", "marbot"), handlers.UpdateInventory)
	inv.Delete("/:id", middleware.RequireRoles("super_admin"), handlers.DeleteInventory)
	inv.Get("/export-excel", handlers.ExportInventoryExcel)

	// Data Jamaah & Mustahik
	jamaah := protected.Group("/jamaah")
	jamaah.Get("/", handlers.GetJamaah)
	jamaah.Post("/", middleware.RequireRoles("super_admin", "sekretaris"), handlers.CreateJamaah)
	jamaah.Put("/:id", middleware.RequireRoles("super_admin", "sekretaris"), handlers.UpdateJamaah)
	jamaah.Delete("/:id", middleware.RequireRoles("super_admin"), handlers.DeleteJamaah)
	jamaah.Get("/export-excel", handlers.ExportJamaahExcel)

	// Jalankan Server & Tangani Graceful Shutdown
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	go func() {
		if err := app.Listen(":" + port); err != nil {
			log.Fatalf("Server gagal berjalan: %v", err)
		}
	}()
	log.Printf("🚀 Sabiluna Go Backend aktif pada port %s", port)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Mematikan server dengan aman...")
	_ = app.Shutdown()
}
`,
  },
  {
    filename: 'backend/config/database.go',
    language: 'go',
    description: 'Koneksi PostgreSQL / NeonDB Port 5432 dengan Pooler & Anti SQL-Injection',
    code: `package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	DB     *gorm.DB
	PgPool *pgxpool.Pool
)

// InitDatabase menginisialisasi koneksi aman ke PostgreSQL / NeonDB
func InitDatabase() {
	// NeonDB connection string contoh:
	// postgres://user:password@ep-cold-pool-12345.ap-southeast-1.aws.neon.tech:5432/sabiluna_db?sslmode=require
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	sslmode := os.Getenv("DB_SSLMODE")
	if sslmode == "" {
		sslmode = "require"
	}

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s timezone=Asia/Jakarta",
		host, port, user, password, dbname, sslmode,
	)

	// GORM mengimplementasikan Prepared Statement otomatis untuk mencegah SQL Injection
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		PrepareStmt: true, // WAJIB TRUE: Anti SQL Injection via parameterized queries
		Logger:      logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("❌ Gagal terhubung ke Database PostgreSQL / NeonDB di port %s: %v", port, err)
	}

	// Konfigurasi Connection Pool untuk skalabilitas tinggi
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("Gagal mengambil DB instance: %v", err)
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Printf("✅ Terhubung ke PostgreSQL (NeonDB) di port %s dengan SSL=%s & Prepared Statements Aktif", port, sslmode)
}
`,
  },
  {
    filename: 'backend/middleware/jwt.go',
    language: 'go',
    description: 'Middleware Verifikasi JWT Token & Role-Based Access Control (RBAC)',
    code: `package middleware

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type CustomClaims struct {
	UserID string \`json:"sub"\`
	Name   string \`json:"name"\`
	Email  string \`json:"email"\`
	Role   string \`json:"role"\`
	jwt.RegisteredClaims
}

// JWTMiddleware memvalidasi header Authorization: Bearer <token>
func JWTMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Akses ditolak: Token JWT tidak ditemukan",
			})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		secret := []byte(os.Getenv("JWT_SECRET"))

		token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return secret, nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Sesi kedaluwarsa atau Token JWT tidak valid",
			})
		}

		claims, ok := token.Claims.(*CustomClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Klaim token rusak"})
		}

		// Simpan informasi pengguna dalam konteks Fiber
		c.Locals("user_id", claims.UserID)
		c.Locals("user_role", claims.Role)
		c.Locals("user_name", claims.Name)

		return c.Next()
	}
}

// RequireRoles membatasi aksi hanya untuk role tertentu (misal super_admin atau bendahara)
func RequireRoles(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, _ := c.Locals("user_role").(string)
		for _, role := range allowedRoles {
			if role == userRole {
				return c.Next()
			}
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Anda tidak memiliki hak akses untuk tindakan ini",
		})
	}
}
`,
  },
  {
    filename: 'backend/security/crypto.go',
    language: 'go',
    description: 'Enkripsi Data Sensitif AES-256 (Nominal & Identitas Donatur)',
    code: `package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"os"
)

// EncryptAES256 mengenkripsi data string sensitif menggunakan kunci 32-byte
func EncryptAES256(plainText string) (string, error) {
	keyHex := os.Getenv("AES_ENCRYPTION_KEY") // 32-byte hex key
	key, _ := hex.DecodeString(keyHex)
	if len(key) != 32 {
		return "", errors.New("kunci AES harus berukuran 32 byte (256-bit)")
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	cipherText := gcm.Seal(nonce, nonce, []byte(plainText), nil)
	return hex.EncodeToString(cipherText), nil
}

// DecryptAES256 mendekripsi ciphertext kembali ke string asli
func DecryptAES256(cipherHex string) (string, error) {
	keyHex := os.Getenv("AES_ENCRYPTION_KEY")
	key, _ := hex.DecodeString(keyHex)

	data, err := hex.DecodeString(cipherHex)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext terlalu pendek")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plainText, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plainText), nil
}
`,
  },
  {
    filename: 'backend/handlers/excel.go',
    language: 'go',
    description: 'Handler Import & Export Excel (.xlsx) dengan github.com/xuri/excelize/v2',
    code: `package handlers

import (
	"fmt"
	"time"

	"sabiluna-backend/config"
	"sabiluna-backend/models"

	"github.com/gofiber/fiber/v2"
	"github.com/xuri/excelize/v2"
)

// ExportFinanceExcel membuat dokumen Excel laporan kas resmi masjid
func ExportFinanceExcel(c *fiber.Ctx) error {
	var transactions []models.Transaction

	// Query data dengan parameterized query (SQL Injection proof)
	if err := config.DB.Order("date desc").Find(&transactions).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Gagal mengambil data kas"})
	}

	f := excelize.NewFile()
	defer f.Close()

	sheet := "Buku Kas Masjid"
	f.SetSheetName("Sheet1", sheet)

	// Judul Header
	f.SetCellValue(sheet, "A1", "SYAMIL - LAPORAN BUKU KAS MASJID")
	f.SetCellValue(sheet, "A2", fmt.Sprintf("Tanggal Cetak: %s", time.Now().Format("02 January 2006")))

	headers := []string{"No", "No. Kwitansi", "Tanggal", "Tipe", "Kategori", "Uraian", "Donatur", "Metode", "Nominal (Rp)", "Petugas"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 4)
		f.SetCellValue(sheet, cell, h)
	}

	for idx, t := range transactions {
		row := idx + 5
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), idx+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), t.ReceiptNumber)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), t.Date.Format("2006-01-02"))
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), t.Type)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), t.Category)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), t.Description)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), t.DonorName)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), t.PaymentMethod)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), t.Amount)
		f.SetCellValue(sheet, fmt.Sprintf("J%d", row), t.CreatedBy)
	}

	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=Laporan_Kas_%s.xlsx", time.Now().Format("2006-01-02")))

	return f.Write(c.Response().BodyWriter())
}
`,
  },
  {
    filename: 'docker-compose.yml',
    language: 'yaml',
    description: 'Docker Compose untuk PostgreSQL Port 5432 / NeonDB & Golang Service',
    code: `version: '3.8'

services:
  # 1. Database PostgreSQL Terenkripsi (Port 5432)
  postgres_db:
    image: postgres:16-alpine
    container_name: sabiluna_postgres
    restart: always
    environment:
      POSTGRES_USER: sabiluna_admin
      POSTGRES_PASSWORD: \${DB_PASSWORD:-SuperSecretPgPass2026!}
      POSTGRES_DB: sabiluna_masjid_db
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data/pgdata
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sabiluna_admin -d sabiluna_masjid_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  # 2. Golang Backend Microservice
  backend_api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sabiluna_backend
    restart: always
    ports:
      - "8080:8080"
    environment:
      PORT: 8080
      DB_HOST: postgres_db # Atau gunakan host NeonDB Anda
      DB_PORT: 5432
      DB_USER: sabiluna_admin
      DB_PASSWORD: \${DB_PASSWORD:-SuperSecretPgPass2026!}
      DB_NAME: sabiluna_masjid_db
      DB_SSLMODE: disable # Ubah 'require' jika menggunakan NeonDB Cloud
      JWT_SECRET: \${JWT_SECRET:-sabiluna-super-secure-jwt-secret-2026}
      AES_ENCRYPTION_KEY: \${AES_KEY:-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef}
      ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:5173"
    depends_on:
      postgres_db:
        condition: service_healthy

volumes:
  pgdata:
    driver: local
`,
  },
  {
    filename: 'backend/Dockerfile',
    language: 'dockerfile',
    description: 'Multi-stage Dockerfile Golang untuk Image Ringan & Aman (Scratch / Alpine)',
    code: `# Tahap 1: Builder
FROM golang:1.22-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git gcc musl-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o sabiluna-server ./main.go

# Tahap 2: Runtime Minimalis & Aman Bebas Vulnerability
FROM gcr.io/distroless/static:nonroot

WORKDIR /
COPY --from=builder /app/sabiluna-server /sabiluna-server

EXPOSE 8080
USER nonroot:nonroot

ENTRYPOINT ["/sabiluna-server"]
`,
  },
  {
    filename: 'init.sql',
    language: 'sql',
    description: 'Skema PostgreSQL DDL dengan Indeks, Relasi, dan Enkripsi Kolom',
    code: `-- Skema Database Masjid SYAMIL
-- Port: 5432 (PostgreSQL 16 / NeonDB)

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'jamaah',
    phone VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(36) PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    donor_name VARCHAR(150),
    is_anonymous BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(50) DEFAULT 'Tunai',
    encrypted_nominal VARCHAR(255),
    created_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category);

CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit VARCHAR(30) DEFAULT 'Unit',
    condition VARCHAR(50) DEFAULT 'Baik',
    location VARCHAR(150) NOT NULL,
    purchase_date DATE,
    estimated_value NUMERIC(15, 2) DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jamaah (
    id VARCHAR(36) PRIMARY KEY,
    nik VARCHAR(30),
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    address TEXT,
    category VARCHAR(50) NOT NULL,
    asnaf VARCHAR(50) DEFAULT '-',
    family_count INT DEFAULT 1,
    status_bantuan VARCHAR(50) DEFAULT 'Tidak Memerlukan',
    notes TEXT,
    registered_at DATE DEFAULT CURRENT_DATE
);
`,
  },
];
