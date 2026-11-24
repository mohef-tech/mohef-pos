package utils

import (
	"errors"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// shortcut: fallback secret only for local dev/test when GIN_MODE != release; set JWT_SECRET in production.
const devFallbackJWTSecret = "dev-only-mohef-pos-jwt-secret-change-me"

type JWTClaims struct {
	UserID     uint   `json:"user_id"`
	BusinessID uint   `json:"business_id"`
	Role       string `json:"role"`
	jwt.RegisteredClaims
}

func resolveJWTSecret() ([]byte, error) {
	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if secret != "" {
		return []byte(secret), nil
	}
	if strings.TrimSpace(os.Getenv("GIN_MODE")) == "release" {
		return nil, errors.New("JWT_SECRET environment variable is required in release mode")
	}
	return []byte(devFallbackJWTSecret), nil
}

func GenerateToken(userID, businessID uint, role string) (string, error) {
	secret, err := resolveJWTSecret()
	if err != nil {
		return "", err
	}

	now := time.Now()
	claims := JWTClaims{
		UserID:     userID,
		BusinessID: businessID,
		Role:       role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatUint(uint64(userID), 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

func VerifyToken(tokenString string) (*JWTClaims, error) {
	secret, err := resolveJWTSecret()
	if err != nil {
		return nil, err
	}

	claims := &JWTClaims{}
	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(t *jwt.Token) (any, error) {
			return secret, nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
	)
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

func HashSecret(plain string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func CheckSecret(hashed, plain string) bool {
	if hashed == "" || plain == "" {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hashed), []byte(plain)) == nil
}
