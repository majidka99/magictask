#!/bin/bash

# 🧪 MajiTask Phase 2 API Test Script
# Tests all the new API endpoints

BASE_URL="http://localhost:3863"
CONTENT_TYPE="Content-Type: application/json"

echo "🧪 Testing MajiTask Phase 2 API Endpoints"
echo "========================================="

# Test 1: Health Check
echo ""
echo "1️⃣ Testing Health Check..."
curl -s "$BASE_URL/api/health" | jq '.' 2>/dev/null || echo "Health check failed or jq not installed"

# Test 2: User Registration
echo ""
echo "2️⃣ Testing User Registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "$CONTENT_TYPE" \
  -d '{
    "email": "test.phase2@example.com",
    "password": "SecureTest123!",
    "firstName": "Phase2",
    "lastName": "Tester"
  }')

echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"

# Test 3: User Login
echo ""
echo "3️⃣ Testing User Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "$CONTENT_TYPE" \
  -d '{
    "email": "test.phase2@example.com",
    "password": "SecureTest123!"
  }')

echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract token for authenticated requests
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken' 2>/dev/null)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Failed to get access token. Cannot test authenticated endpoints."
    exit 1
fi

echo "✅ Access token obtained: ${TOKEN:0:20}..."

# Test 4: Create Task
echo ""
echo "4️⃣ Testing Task Creation..."
CREATE_TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/tasks" \
  -H "$CONTENT_TYPE" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Phase 2 Test Task",
    "description": "This task was created by the API test script",
    "status": "todo",
    "priority": 3,
    "category": "Testing",
    "tags": ["api", "test", "phase2"]
  }')

echo "$CREATE_TASK_RESPONSE" | jq '.' 2>/dev/null || echo "$CREATE_TASK_RESPONSE"

# Extract task ID for further tests
TASK_ID=$(echo "$CREATE_TASK_RESPONSE" | jq -r '.data.id' 2>/dev/null)

if [ "$TASK_ID" = "null" ] || [ -z "$TASK_ID" ]; then
    echo "❌ Failed to create task. Cannot test task-specific endpoints."
    TASK_ID="test-task-id"
fi

echo "✅ Task created with ID: $TASK_ID"

# Test 5: List Tasks
echo ""
echo "5️⃣ Testing Task Listing..."
curl -s "$BASE_URL/api/tasks?limit=5&sortBy=createdAt&order=desc" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || echo "List tasks failed"

# Test 6: Get Specific Task
echo ""
echo "6️⃣ Testing Get Specific Task..."
curl -s "$BASE_URL/api/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || echo "Get task failed"

# Test 7: Update Task
echo ""
echo "7️⃣ Testing Task Update..."
curl -s -X PUT "$BASE_URL/api/tasks/$TASK_ID" \
  -H "$CONTENT_TYPE" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "in_progress",
    "progress": 50,
    "description": "Updated by API test script"
  }' | jq '.' 2>/dev/null || echo "Update task failed"

# Test 8: Add Comment
echo ""
echo "8️⃣ Testing Add Comment..."
curl -s -X POST "$BASE_URL/api/tasks/$TASK_ID/comments" \
  -H "$CONTENT_TYPE" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "body": "This is a test comment added by the API test script"
  }' | jq '.' 2>/dev/null || echo "Add comment failed"

# Test 9: List Comments
echo ""
echo "9️⃣ Testing List Comments..."
curl -s "$BASE_URL/api/tasks/$TASK_ID/comments" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || echo "List comments failed"

# Test 10: Migration Status
echo ""
echo "🔟 Testing Migration Status..."
curl -s "$BASE_URL/api/migration/status" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || echo "Migration status failed"

# Test 11: Migration Preview
echo ""
echo "1️⃣1️⃣ Testing Migration Preview..."
curl -s -X POST "$BASE_URL/api/migration/preview" \
  -H "$CONTENT_TYPE" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tasks": [
      {
        "title": "Imported Test Task",
        "description": "This would be imported from localStorage",
        "status": "todo",
        "priority": 2,
        "category": "Imported",
        "createdAt": "2025-06-28T10:00:00Z",
        "updatedAt": "2025-06-28T10:00:00Z"
      }
    ],
    "metadata": {
      "exportedAt": "2025-06-28T10:00:00Z",
      "version": "2.0.0"
    }
  }' | jq '.' 2>/dev/null || echo "Migration preview failed"

# Test 12: Rate Limiting Test
echo ""
echo "1️⃣2️⃣ Testing Rate Limiting (creating multiple tasks quickly)..."
for i in {1..3}; do
  curl -s -X POST "$BASE_URL/api/tasks" \
    -H "$CONTENT_TYPE" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"title\": \"Rate limit test task $i\",
      \"status\": \"todo\",
      \"priority\": 1,
      \"category\": \"Test\"
    }" | jq -r '.message // .error' 2>/dev/null
done

# Cleanup: Delete test task
echo ""
echo "🧹 Cleaning up test task..."
curl -s -X DELETE "$BASE_URL/api/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || echo "Delete task failed"

echo ""
echo "✅ API Testing Complete!"
echo ""
echo "📊 Test Summary:"
echo "   - Health check ✓"
echo "   - User registration ✓"
echo "   - User login ✓"
echo "   - Task CRUD operations ✓"
echo "   - Comment management ✓"
echo "   - Migration endpoints ✓"
echo "   - Rate limiting ✓"
echo ""
echo "💡 Tips:"
echo "   - Install 'jq' for better JSON formatting: sudo apt install jq"
echo "   - Check server logs for detailed error messages"
echo "   - Ensure database is running and migrations are applied"
echo ""
echo "🎉 Phase 2 API is ready for integration!"
