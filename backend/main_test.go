package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/config"
)

func TestResolveDSN(t *testing.T) {
	t.Run("uses default local docker DSN when env vars unset", func(t *testing.T) {
		t.Setenv("DATABASE_URL", "")
		t.Setenv("DB_HOST", "")
		t.Setenv("DB_PORT", "")
		t.Setenv("DB_USER", "")
		t.Setenv("DB_PASSWORD", "")
		t.Setenv("DB_NAME", "")
		t.Setenv("DB_SSLMODE", "")
		t.Setenv("DB_TIMEZONE", "")

		dsn := config.ResolveDSN()
		if !strings.Contains(dsn, "user=pos_admin") || !strings.Contains(dsn, "dbname=mohef_pos_db") {
			t.Fatalf("unexpected default DSN: %s", dsn)
		}
	})

	t.Run("prefers DATABASE_URL when set", func(t *testing.T) {
		t.Setenv("DATABASE_URL", "postgres://custom:pass@db:5432/custom_db")

		if got := config.ResolveDSN(); got != "postgres://custom:pass@db:5432/custom_db" {
			t.Fatalf("expected DATABASE_URL override, got %q", got)
		}
	})
}

func TestCORSMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	origins := parseAllowedOrigins("http://localhost:5173,http://127.0.0.1:5173")
	router := setupRouter(nil, origins)

	t.Run("allows Vite preflight origin", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/health", nil)
		req.Header.Set("Origin", "http://localhost:5173")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Fatalf("expected 204, got %d", rec.Code)
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
			t.Fatalf("expected allow origin header, got %q", got)
		}
	})

	t.Run("blocks unlisted origin header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/health", nil)
		req.Header.Set("Origin", "https://evil.example")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Fatalf("expected empty allow origin header, got %q", got)
		}
	})
}
