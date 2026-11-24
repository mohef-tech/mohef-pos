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

func TestAuthLoginRouteValidation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := setupRouter(nil, parseAllowedOrigins("http://localhost:5173"))

	t.Run("rejects invalid role", func(t *testing.T) {
		body := strings.NewReader(`{"role":"guest"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", body)
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("requires email and password for owner", func(t *testing.T) {
		body := strings.NewReader(`{"role":"owner","email":"owner@mohefpos.local"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", body)
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("requires username and pin for cashier", func(t *testing.T) {
		body := strings.NewReader(`{"role":"cashier","username":"kasir1"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", body)
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()

		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rec.Code)
		}
	})
}

func TestProductRoutesRequireAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := setupRouter(nil, parseAllowedOrigins("http://localhost:5173"))

	for _, tc := range []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/products"},
		{http.MethodPost, "/api/products"},
		{http.MethodPost, "/api/products/adjust-stock"},
	} {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s: expected 401 without token, got %d", tc.method, tc.path, rec.Code)
		}
	}
}
