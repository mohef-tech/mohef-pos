package controllers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mohef-tech/mohef-pos/backend/models"
	"github.com/mohef-tech/mohef-pos/backend/utils"
	"gorm.io/gorm"
)

type AuthController struct {
	DB *gorm.DB
}

func NewAuthController(db *gorm.DB) *AuthController {
	return &AuthController{DB: db}
}

type LoginRequest struct {
	Role     string `json:"role" binding:"required"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Username string `json:"username"`
	PIN      string `json:"pin"`
}

func (ac *AuthController) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload tidak valid, field role wajib diisi"})
		return
	}

	role := strings.ToLower(strings.TrimSpace(req.Role))
	if role != models.RoleOwner && role != models.RoleCashier {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role tidak valid, gunakan 'owner' atau 'cashier'"})
		return
	}

	if role == models.RoleOwner {
		email := strings.ToLower(strings.TrimSpace(req.Email))
		if email == "" || req.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "email dan password wajib diisi untuk owner"})
			return
		}
		if ac.DB == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database belum siap"})
			return
		}

		var user models.User
		err := ac.DB.Where("LOWER(email) = ? AND role = ?", email, models.RoleOwner).First(&user).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "email atau password salah"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memeriksa akun"})
			return
		}

		if !utils.CheckSecret(user.PasswordHash, req.Password) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "email atau password salah"})
			return
		}

		ac.respondWithToken(c, &user)
		return
	}

	username := strings.TrimSpace(req.Username)
	if username == "" || req.PIN == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username dan pin wajib diisi untuk kasir"})
		return
	}
	if ac.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database belum siap"})
		return
	}

	var user models.User
	err := ac.DB.Where("LOWER(username) = LOWER(?) AND role = ?", username, models.RoleCashier).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "username atau pin salah"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memeriksa akun"})
		return
	}

	if !utils.CheckSecret(user.PinCode, req.PIN) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "username atau pin salah"})
		return
	}

	ac.respondWithToken(c, &user)
}

func (ac *AuthController) respondWithToken(c *gin.Context, user *models.User) {
	token, err := utils.GenerateToken(user.ID, user.BusinessID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membuat token autentikasi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}
