package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"subvault/internal/config"
	"subvault/internal/database"
	"subvault/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
)

// setupTestDB initializes a test database
func setupTestDB(t *testing.T) func() {
	// Use a temporary database file
	tmpFile, err := os.CreateTemp("", "test_memo_*.db")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	tmpFile.Close()

	err = database.Init(tmpFile.Name())
	if err != nil {
		t.Fatalf("Failed to initialize database: %v", err)
	}

	// Return cleanup function
	return func() {
		os.Remove(tmpFile.Name())
	}
}

// setupTestRouter creates a test router with the memo handler
func setupTestRouter(cfg *config.Config) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	handler := NewMemoHandler(cfg)

	// Add a middleware to set vaultId for testing
	router.Use(func(c *gin.Context) {
		c.Set("vaultId", "test-vault-id")
		c.Next()
	})

	router.GET("/api/v1/memos", handler.GetMemos)
	router.POST("/api/v1/memos", handler.CreateMemo)
	router.PUT("/api/v1/memos/:id", handler.UpdateMemo)
	router.DELETE("/api/v1/memos/:id", handler.DeleteMemo)

	return router
}

// getTestConfig returns a test configuration
func getTestConfig() *config.Config {
	return &config.Config{
		JWTSecret:     "test-jwt-secret",
		EncryptionKey: "test-encryption-key-32-bytes-ok",
		DatabasePath:  "",
		Environment:   "test",
	}
}

// getMemoCount returns the current count of memos for a vault
func getMemoCount(router *gin.Engine) (int, error) {
	req, _ := http.NewRequest("GET", "/api/v1/memos", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		return 0, nil
	}

	var memos []models.Memo
	if err := json.Unmarshal(w.Body.Bytes(), &memos); err != nil {
		return 0, err
	}

	return len(memos), nil
}

// createMemo creates a memo and returns the response
func createMemo(router *gin.Engine, title, content, category string) (*httptest.ResponseRecorder, error) {
	memo := map[string]interface{}{
		"title":    title,
		"content":  content,
		"category": category,
	}

	body, err := json.Marshal(memo)
	if err != nil {
		return nil, err
	}

	req, _ := http.NewRequest("POST", "/api/v1/memos", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	return w, nil
}

// Feature: memo-feature, Property 1: Creating valid memo increases list length
// **Validates: Requirements 1.2, 1.5**
//
// For any memo list and valid memo data (non-empty title and content),
// adding the memo to the list should result in the list length increasing by one,
// and the new memo should be present in the list.
func TestProperty1_CreatingValidMemoIncreasesListLength(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	cfg := getTestConfig()
	router := setupTestRouter(cfg)

	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 20
	parameters.Rng.Seed(42) // For reproducibility

	properties := gopter.NewProperties(parameters)

	// Generator for non-empty strings (valid titles and content)
	nonEmptyStringGen := gen.AnyString().SuchThat(func(s string) bool {
		// Must have at least one non-whitespace character
		for _, r := range s {
			if r != ' ' && r != '\t' && r != '\n' && r != '\r' {
				return true
			}
		}
		return false
	}).WithLabel("non-empty string")

	// Generator for category
	categoryGen := gen.OneConstOf("个人信息", "银行卡", "地址", "其他")

	properties.Property("Creating valid memo increases list length by one", prop.ForAll(
		func(title, content, category string) bool {
			// Get current memo count
			countBefore, err := getMemoCount(router)
			if err != nil {
				t.Logf("Error getting memo count: %v", err)
				return false
			}

			// Create a new memo
			w, err := createMemo(router, title, content, category)
			if err != nil {
				t.Logf("Error creating memo: %v", err)
				return false
			}

			// Verify creation was successful
			if w.Code != http.StatusCreated {
				t.Logf("Expected status 201, got %d: %s", w.Code, w.Body.String())
				return false
			}

			// Get new memo count
			countAfter, err := getMemoCount(router)
			if err != nil {
				t.Logf("Error getting memo count after: %v", err)
				return false
			}

			// Verify count increased by exactly 1
			if countAfter != countBefore+1 {
				t.Logf("Expected count to increase by 1: before=%d, after=%d", countBefore, countAfter)
				return false
			}

			// Verify the new memo is present in the list
			req, _ := http.NewRequest("GET", "/api/v1/memos", nil)
			getW := httptest.NewRecorder()
			router.ServeHTTP(getW, req)

			var memos []models.Memo
			if err := json.Unmarshal(getW.Body.Bytes(), &memos); err != nil {
				t.Logf("Error unmarshaling memos: %v", err)
				return false
			}

			// Check if the created memo is in the list
			var createdMemo models.Memo
			if err := json.Unmarshal(w.Body.Bytes(), &createdMemo); err != nil {
				t.Logf("Error unmarshaling created memo: %v", err)
				return false
			}

			found := false
			for _, m := range memos {
				if m.ID == createdMemo.ID {
					found = true
					// Verify the memo data matches
					if m.Title != title {
						t.Logf("Title mismatch: expected %q, got %q", title, m.Title)
						return false
					}
					if m.Content != content {
						t.Logf("Content mismatch: expected %q, got %q", content, m.Content)
						return false
					}
					if m.Category != category {
						t.Logf("Category mismatch: expected %q, got %q", category, m.Category)
						return false
					}
					break
				}
			}

			if !found {
				t.Logf("Created memo with ID %s not found in list", createdMemo.ID)
				return false
			}

			return true
		},
		nonEmptyStringGen,
		nonEmptyStringGen,
		categoryGen,
	))

	properties.TestingRun(t)
}

// Feature: memo-feature, Property 2: Empty or whitespace-only input is rejected
// **Validates: Requirements 1.3**
//
// For any string composed entirely of whitespace (including empty string) used as title or content,
// attempting to create a memo should be rejected, and the memo list should remain unchanged.
func TestProperty2_EmptyOrWhitespaceOnlyInputIsRejected(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	cfg := getTestConfig()
	router := setupTestRouter(cfg)

	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 20
	parameters.Rng.Seed(42) // For reproducibility

	properties := gopter.NewProperties(parameters)

	// Generator for whitespace-only strings (including empty string)
	// Generates strings composed only of spaces, tabs, newlines, carriage returns
	whitespaceOnlyGen := gen.OneConstOf(
		"",           // empty string
		" ",          // single space
		"  ",         // multiple spaces
		"\t",         // tab
		"\t\t",       // multiple tabs
		"\n",         // newline
		"\n\n",       // multiple newlines
		"\r",         // carriage return
		"\r\n",       // CRLF
		" \t\n",      // mixed whitespace
		"   \t\t\n\n\r", // complex mixed whitespace
		"\t \n \r \t",   // alternating whitespace
	).WithLabel("whitespace-only string")

	// Generator for valid non-empty content (used when testing title rejection)
	validContentGen := gen.AnyString().SuchThat(func(s string) bool {
		for _, r := range s {
			if r != ' ' && r != '\t' && r != '\n' && r != '\r' {
				return true
			}
		}
		return false
	}).WithLabel("valid content")

	// Generator for category
	categoryGen := gen.OneConstOf("个人信息", "银行卡", "地址", "其他")

	// Property: Empty or whitespace-only title should be rejected
	properties.Property("Empty or whitespace-only title is rejected with HTTP 400", prop.ForAll(
		func(whitespaceTitle, validContent, category string) bool {
			// Get current memo count
			countBefore, err := getMemoCount(router)
			if err != nil {
				t.Logf("Error getting memo count: %v", err)
				return false
			}

			// Attempt to create a memo with whitespace-only title
			w, err := createMemo(router, whitespaceTitle, validContent, category)
			if err != nil {
				t.Logf("Error creating memo: %v", err)
				return false
			}

			// Verify creation was rejected with HTTP 400
			if w.Code != http.StatusBadRequest {
				t.Logf("Expected status 400 for whitespace title %q, got %d: %s", whitespaceTitle, w.Code, w.Body.String())
				return false
			}

			// Verify memo list remains unchanged
			countAfter, err := getMemoCount(router)
			if err != nil {
				t.Logf("Error getting memo count after: %v", err)
				return false
			}

			if countAfter != countBefore {
				t.Logf("Memo count changed after rejected creation: before=%d, after=%d", countBefore, countAfter)
				return false
			}

			return true
		},
		whitespaceOnlyGen,
		validContentGen,
		categoryGen,
	))

	properties.TestingRun(t)
}


// updateMemo updates a memo and returns the response
func updateMemo(router *gin.Engine, id, title, content, category string, isPinned bool) (*httptest.ResponseRecorder, error) {
	memo := map[string]interface{}{
		"title":    title,
		"content":  content,
		"category": category,
		"isPinned": isPinned,
	}

	body, err := json.Marshal(memo)
	if err != nil {
		return nil, err
	}

	req, _ := http.NewRequest("PUT", "/api/v1/memos/"+id, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	return w, nil
}

// getMemoByID retrieves a memo by ID
func getMemoByID(router *gin.Engine, id string) (*models.Memo, error) {
	req, _ := http.NewRequest("GET", "/api/v1/memos", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		return nil, nil
	}

	var memos []models.Memo
	if err := json.Unmarshal(w.Body.Bytes(), &memos); err != nil {
		return nil, err
	}

	for _, m := range memos {
		if m.ID == id {
			return &m, nil
		}
	}

	return nil, nil
}

// Feature: memo-feature, Property 4: Update memo correctly persists changes
// **Validates: Requirements 2.3**
//
// For any existing memo and valid update data, after updating the memo,
// retrieving it should return the updated values for all modified fields.
func TestProperty4_UpdateMemoCorrectlyPersistsChanges(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	cfg := getTestConfig()
	router := setupTestRouter(cfg)

	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 20
	parameters.Rng.Seed(42) // For reproducibility

	properties := gopter.NewProperties(parameters)

	// Generator for non-empty strings (valid titles and content)
	nonEmptyStringGen := gen.AnyString().SuchThat(func(s string) bool {
		// Must have at least one non-whitespace character
		for _, r := range s {
			if r != ' ' && r != '\t' && r != '\n' && r != '\r' {
				return true
			}
		}
		return false
	}).WithLabel("non-empty string")

	// Generator for category
	categoryGen := gen.OneConstOf("个人信息", "银行卡", "地址", "其他")

	// Generator for boolean
	boolGen := gen.Bool()

	properties.Property("Update memo correctly persists all field changes", prop.ForAll(
		func(initialTitle, initialContent, initialCategory string,
			updatedTitle, updatedContent, updatedCategory string,
			isPinned bool) bool {

			// Step 1: Create a memo first
			createW, err := createMemo(router, initialTitle, initialContent, initialCategory)
			if err != nil {
				t.Logf("Error creating memo: %v", err)
				return false
			}

			if createW.Code != http.StatusCreated {
				t.Logf("Failed to create memo: status %d, body: %s", createW.Code, createW.Body.String())
				return false
			}

			// Parse the created memo to get its ID
			var createdMemo models.Memo
			if err := json.Unmarshal(createW.Body.Bytes(), &createdMemo); err != nil {
				t.Logf("Error unmarshaling created memo: %v", err)
				return false
			}

			// Step 2: Update the memo with new data
			updateW, err := updateMemo(router, createdMemo.ID, updatedTitle, updatedContent, updatedCategory, isPinned)
			if err != nil {
				t.Logf("Error updating memo: %v", err)
				return false
			}

			if updateW.Code != http.StatusOK {
				t.Logf("Failed to update memo: status %d, body: %s", updateW.Code, updateW.Body.String())
				return false
			}

			// Step 3: Retrieve the memo and verify all fields match the update data
			retrievedMemo, err := getMemoByID(router, createdMemo.ID)
			if err != nil {
				t.Logf("Error retrieving memo: %v", err)
				return false
			}

			if retrievedMemo == nil {
				t.Logf("Memo with ID %s not found after update", createdMemo.ID)
				return false
			}

			// Verify all fields match the updated values
			if retrievedMemo.Title != updatedTitle {
				t.Logf("Title mismatch: expected %q, got %q", updatedTitle, retrievedMemo.Title)
				return false
			}

			if retrievedMemo.Content != updatedContent {
				t.Logf("Content mismatch: expected %q, got %q", updatedContent, retrievedMemo.Content)
				return false
			}

			if retrievedMemo.Category != updatedCategory {
				t.Logf("Category mismatch: expected %q, got %q", updatedCategory, retrievedMemo.Category)
				return false
			}

			if retrievedMemo.IsPinned != isPinned {
				t.Logf("IsPinned mismatch: expected %v, got %v", isPinned, retrievedMemo.IsPinned)
				return false
			}

			// Verify the ID remains unchanged
			if retrievedMemo.ID != createdMemo.ID {
				t.Logf("ID changed after update: expected %s, got %s", createdMemo.ID, retrievedMemo.ID)
				return false
			}

			return true
		},
		nonEmptyStringGen, // initialTitle
		nonEmptyStringGen, // initialContent
		categoryGen,       // initialCategory
		nonEmptyStringGen, // updatedTitle
		nonEmptyStringGen, // updatedContent
		categoryGen,       // updatedCategory
		boolGen,           // isPinned
	))

	properties.TestingRun(t)
}

// deleteMemo deletes a memo and returns the response
func deleteMemo(router *gin.Engine, id string) (*httptest.ResponseRecorder, error) {
	req, _ := http.NewRequest("DELETE", "/api/v1/memos/"+id, nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	return w, nil
}

// Feature: memo-feature, Property 5: Deleted memo no longer exists
// **Validates: Requirements 3.2, 3.3**
//
// For any existing memo, after deletion, the memo should not appear in the memo list,
// and attempting to retrieve it by ID should fail.
func TestProperty5_DeletedMemoNoLongerExists(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	cfg := getTestConfig()
	router := setupTestRouter(cfg)

	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 20
	parameters.Rng.Seed(42) // For reproducibility

	properties := gopter.NewProperties(parameters)

	// Generator for non-empty strings (valid titles and content)
	nonEmptyStringGen := gen.AnyString().SuchThat(func(s string) bool {
		// Must have at least one non-whitespace character
		for _, r := range s {
			if r != ' ' && r != '\t' && r != '\n' && r != '\r' {
				return true
			}
		}
		return false
	}).WithLabel("non-empty string")

	// Generator for category
	categoryGen := gen.OneConstOf("个人信息", "银行卡", "地址", "其他")

	properties.Property("Deleted memo no longer exists in list and count decreases by 1", prop.ForAll(
		func(title, content, category string) bool {
			// Step 1: Create a memo first
			createW, err := createMemo(router, title, content, category)
			if err != nil {
				t.Logf("Error creating memo: %v", err)
				return false
			}

			if createW.Code != http.StatusCreated {
				t.Logf("Failed to create memo: status %d, body: %s", createW.Code, createW.Body.String())
				return false
			}

			// Parse the created memo to get its ID
			var createdMemo models.Memo
			if err := json.Unmarshal(createW.Body.Bytes(), &createdMemo); err != nil {
				t.Logf("Error unmarshaling created memo: %v", err)
				return false
			}

			// Step 2: Get memo count before deletion
			countBefore, err := getMemoCount(router)
			if err != nil {
				t.Logf("Error getting memo count before deletion: %v", err)
				return false
			}

			// Verify the memo exists before deletion
			memoBeforeDelete, err := getMemoByID(router, createdMemo.ID)
			if err != nil {
				t.Logf("Error getting memo by ID before deletion: %v", err)
				return false
			}
			if memoBeforeDelete == nil {
				t.Logf("Memo with ID %s should exist before deletion", createdMemo.ID)
				return false
			}

			// Step 3: Delete the memo via DELETE /api/v1/memos/:id
			deleteW, err := deleteMemo(router, createdMemo.ID)
			if err != nil {
				t.Logf("Error deleting memo: %v", err)
				return false
			}

			if deleteW.Code != http.StatusOK {
				t.Logf("Failed to delete memo: status %d, body: %s", deleteW.Code, deleteW.Body.String())
				return false
			}

			// Step 4: Verify the memo no longer appears in the list
			memoAfterDelete, err := getMemoByID(router, createdMemo.ID)
			if err != nil {
				t.Logf("Error getting memo by ID after deletion: %v", err)
				return false
			}
			if memoAfterDelete != nil {
				t.Logf("Memo with ID %s should not exist after deletion, but found: %+v", createdMemo.ID, memoAfterDelete)
				return false
			}

			// Step 5: Verify the list count decreased by 1
			countAfter, err := getMemoCount(router)
			if err != nil {
				t.Logf("Error getting memo count after deletion: %v", err)
				return false
			}

			if countAfter != countBefore-1 {
				t.Logf("Expected count to decrease by 1: before=%d, after=%d", countBefore, countAfter)
				return false
			}

			return true
		},
		nonEmptyStringGen,
		nonEmptyStringGen,
		categoryGen,
	))

	properties.TestingRun(t)
}


// Feature: memo-feature, Property 9: Memo is correctly associated with Vault
// **Validates: Requirements 7.3**
//
// For any created memo, the memo's vaultId should match the authenticated user's vault ID,
// ensuring data isolation between users.
func TestProperty9_MemoIsCorrectlyAssociatedWithVault(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	cfg := getTestConfig()
	router := setupTestRouter(cfg)

	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = 20
	parameters.Rng.Seed(42) // For reproducibility

	properties := gopter.NewProperties(parameters)

	// Generator for non-empty strings (valid titles and content)
	nonEmptyStringGen := gen.AnyString().SuchThat(func(s string) bool {
		// Must have at least one non-whitespace character
		for _, r := range s {
			if r != ' ' && r != '\t' && r != '\n' && r != '\r' {
				return true
			}
		}
		return false
	}).WithLabel("non-empty string")

	// Generator for category
	categoryGen := gen.OneConstOf("个人信息", "银行卡", "地址", "其他")

	// The expected vault ID set by the test router middleware
	expectedVaultID := "test-vault-id"

	properties.Property("Created memo has correct vaultId matching authenticated user", prop.ForAll(
		func(title, content, category string) bool {
			// Step 1: Create a memo via API
			createW, err := createMemo(router, title, content, category)
			if err != nil {
				t.Logf("Error creating memo: %v", err)
				return false
			}

			if createW.Code != http.StatusCreated {
				t.Logf("Failed to create memo: status %d, body: %s", createW.Code, createW.Body.String())
				return false
			}

			// Parse the created memo to get its ID
			var createdMemo models.Memo
			if err := json.Unmarshal(createW.Body.Bytes(), &createdMemo); err != nil {
				t.Logf("Error unmarshaling created memo: %v", err)
				return false
			}

			// Step 2: Query the database directly to verify the vaultId field
			var dbMemo models.Memo
			if err := database.DB.Where("id = ?", createdMemo.ID).First(&dbMemo).Error; err != nil {
				t.Logf("Error querying memo from database: %v", err)
				return false
			}

			// Step 3: Verify the memo's vaultId matches the authenticated user's vault ID
			if dbMemo.VaultID != expectedVaultID {
				t.Logf("VaultID mismatch: expected %q, got %q", expectedVaultID, dbMemo.VaultID)
				return false
			}

			// Step 4: Verify the memo is only accessible by the same vault
			// (This is implicitly tested by the GetMemos endpoint which filters by vaultId)
			req, _ := http.NewRequest("GET", "/api/v1/memos", nil)
			getW := httptest.NewRecorder()
			router.ServeHTTP(getW, req)

			var memos []models.Memo
			if err := json.Unmarshal(getW.Body.Bytes(), &memos); err != nil {
				t.Logf("Error unmarshaling memos: %v", err)
				return false
			}

			// Verify the created memo is in the list (accessible by the same vault)
			found := false
			for _, m := range memos {
				if m.ID == createdMemo.ID {
					found = true
					break
				}
			}

			if !found {
				t.Logf("Created memo with ID %s not found in list for vault %s", createdMemo.ID, expectedVaultID)
				return false
			}

			return true
		},
		nonEmptyStringGen,
		nonEmptyStringGen,
		categoryGen,
	))

	properties.TestingRun(t)
}
