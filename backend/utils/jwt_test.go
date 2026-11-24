package utils

import "testing"

func TestGenerateAndVerifyToken(t *testing.T) {
	t.Setenv("JWT_SECRET", "unit-test-secret-key")

	token, err := GenerateToken(7, 1, "owner")
	if err != nil {
		t.Fatalf("expected token generation to succeed, got error: %v", err)
	}

	claims, err := VerifyToken(token)
	if err != nil {
		t.Fatalf("expected token verification to succeed, got error: %v", err)
	}
	if claims.UserID != 7 || claims.BusinessID != 1 || claims.Role != "owner" {
		t.Fatalf("unexpected claims: %+v", claims)
	}

	t.Setenv("JWT_SECRET", "different-secret-key")
	if _, err := VerifyToken(token); err == nil {
		t.Fatal("expected verification to fail with wrong secret")
	}
}

func TestHashAndCheckSecret(t *testing.T) {
	hash, err := HashSecret("123456")
	if err != nil {
		t.Fatalf("expected hash to succeed, got error: %v", err)
	}
	if !CheckSecret(hash, "123456") {
		t.Fatal("expected CheckSecret to match original value")
	}
	if CheckSecret(hash, "654321") {
		t.Fatal("expected CheckSecret to reject wrong value")
	}
}
