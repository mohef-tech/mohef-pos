package utils

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "header Authorization wajib disertakan"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "format Authorization harus 'Bearer <token>'"})
			return
		}

		claims, err := VerifyToken(strings.TrimSpace(parts[1]))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token tidak valid atau sudah kedaluwarsa"})
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("business_id", claims.BusinessID)
		c.Set("role", claims.Role)
		c.Next()
	}
}
