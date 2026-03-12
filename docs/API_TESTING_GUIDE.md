# API Testing Guide

This guide explains how to test the API endpoints locally and in production.

## Prerequisites

- Bearer token (obtained after login from the web app)
- `curl` or Postman for testing
- The API server running locally or deployed

## Environment Setup

### Get Your Bearer Token

1. Go to `http://localhost:3000/auth/login`
2. Sign in with your test account
3. Open browser DevTools (F12) → Application → Cookies
4. Find the `sb-*` cookie containing your session
5. Or use the Supabase client from the browser console:

```javascript
const supabase = window.supabaseClient || 
  await import("/path/to/client.ts").then(m => m.createClient());
const { data: { session } } = await supabase.auth.getSession();
console.log(session.access_token);
```

### Postman Setup

1. Create a new collection: "Procurement Radar API"
2. Add a variable: `token` = your bearer token
3. Add a variable: `baseUrl` = `http://localhost:3000` or production URL
4. In each request, set header: `Authorization: Bearer {{token}}`

---

## Testing Workflow

### 1. Health Check (No Auth Required)

```bash
curl -X GET "http://localhost:3000/api/health"
```

**Expected**: 200 OK with service status

---

### 2. Tenders Endpoints

#### List Tenders
```bash
curl -X GET "http://localhost:3000/api/tenders" \
  -H "Authorization: Bearer $TOKEN"
```

#### List with Filters
```bash
curl -X GET "http://localhost:3000/api/tenders?category=courier&priority=high&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

#### Check Pagination
```bash
curl -X GET "http://localhost:3000/api/tenders?limit=2&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 3. Sources Endpoints

#### List Sources
```bash
curl -X GET "http://localhost:3000/api/sources" \
  -H "Authorization: Bearer $TOKEN"
```

#### Create Source
```bash
curl -X POST "http://localhost:3000/api/sources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Portal",
    "url": "https://test.example.com",
    "type": "portal",
    "crawl_frequency": "daily"
  }'
```

**Expected**: 201 Created with source details

#### Update Source
```bash
curl -X PUT "http://localhost:3000/api/sources/{id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "enabled": false
  }'
```

#### Delete Source
```bash
curl -X DELETE "http://localhost:3000/api/sources/{id}" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 4. Subscribers Endpoints

#### List Subscribers
```bash
curl -X GET "http://localhost:3000/api/subscribers" \
  -H "Authorization: Bearer $TOKEN"
```

#### Create Subscriber (with Plan Limit Check)
```bash
curl -X POST "http://localhost:3000/api/subscribers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "subscriber@example.com",
    "name": "Test Subscriber",
    "categories": ["courier", "printing"]
  }'
```

**Expected**: 201 Created or 409 Conflict if limit reached

#### Update Subscriber
```bash
curl -X PUT "http://localhost:3000/api/subscribers/{id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "categories": ["printing"],
    "is_active": false
  }'
```

#### Delete Subscriber
```bash
curl -X DELETE "http://localhost:3000/api/subscribers/{id}" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 5. Digests Endpoints

#### List Digests
```bash
curl -X GET "http://localhost:3000/api/digests" \
  -H "Authorization: Bearer $TOKEN"
```

#### List Digests with Status Filter
```bash
curl -X GET "http://localhost:3000/api/digests?status=success" \
  -H "Authorization: Bearer $TOKEN"
```

#### Get Digest Details
```bash
curl -X GET "http://localhost:3000/api/digests/{id}" \
  -H "Authorization: Bearer $TOKEN"
```

#### Trigger Manual Digest
```bash
curl -X POST "http://localhost:3000/api/digests/send" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: 202 Accepted

---

### 6. Analytics Endpoints

#### Dashboard Statistics
```bash
curl -X GET "http://localhost:3000/api/analytics/dashboard" \
  -H "Authorization: Bearer $TOKEN"
```

#### Trends (Last 30 Days, By Day)
```bash
curl -X GET "http://localhost:3000/api/analytics/trends?days=30&groupBy=day" \
  -H "Authorization: Bearer $TOKEN"
```

#### Trends (Last 3 Months, By Week)
```bash
curl -X GET "http://localhost:3000/api/analytics/trends?days=90&groupBy=week" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Security Testing

### 1. Rate Limiting Test

Make 101 requests in succession (should fail on 101st):

```bash
for i in {1..101}; do
  curl -X GET "http://localhost:3000/api/tenders" \
    -H "Authorization: Bearer $TOKEN"
  echo "Request $i"
done
```

**Expected**: 429 Too Many Requests on request 101+

### 2. Authentication Test

Try without token:
```bash
curl -X GET "http://localhost:3000/api/tenders"
```

**Expected**: 401 Unauthorized

### 3. Invalid Token Test

```bash
curl -X GET "http://localhost:3000/api/tenders" \
  -H "Authorization: Bearer invalid-token-123"
```

**Expected**: 401 Unauthorized

### 4. Validation Test

Try with invalid data:
```bash
curl -X POST "http://localhost:3000/api/subscribers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "not-an-email",
    "name": "",
    "categories": []
  }'
```

**Expected**: 400 Validation Error with field details

---

## Error Scenarios

### Test Ownership Verification

1. Create a subscriber as User A
2. Switch to User B's token
3. Try to delete the subscriber

```bash
curl -X DELETE "http://localhost:3000/api/subscribers/{user-a-subscriber-id}" \
  -H "Authorization: Bearer $USER_B_TOKEN"
```

**Expected**: 404 Not Found

### Test Plan Limits

1. Upgrade to starter plan (1 subscriber limit)
2. Create max subscribers
3. Try to add one more

**Expected**: 409 Conflict with message about limit

---

## Automated Testing with Script

Create `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="${1:-http://localhost:3000}"
TOKEN="$2"

if [ -z "$TOKEN" ]; then
  echo "Usage: ./test-api.sh [BASE_URL] [TOKEN]"
  exit 1
fi

echo "🧪 Testing API Endpoints"
echo "Base URL: $BASE_URL"
echo ""

# Test health
echo "✓ Testing /api/health"
curl -s -X GET "$BASE_URL/api/health" | jq .

# Test tenders
echo "✓ Testing /api/tenders"
curl -s -X GET "$BASE_URL/api/tenders" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.pagination'

# Test sources
echo "✓ Testing /api/sources"
curl -s -X GET "$BASE_URL/api/sources" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.count'

# Test subscribers
echo "✓ Testing /api/subscribers"
curl -s -X GET "$BASE_URL/api/subscribers" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.pagination'

# Test analytics
echo "✓ Testing /api/analytics/dashboard"
curl -s -X GET "$BASE_URL/api/analytics/dashboard" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.overview'

echo ""
echo "✅ All tests completed"
```

Run it:
```bash
chmod +x test-api.sh
./test-api.sh http://localhost:3000 $TOKEN
```

---

## Postman Collection

Export this as a Postman environment:

```json
{
  "name": "Procurement Radar",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "enabled": true
    },
    {
      "key": "token",
      "value": "your-bearer-token",
      "enabled": true
    }
  ]
}
```

Let Postman automatically save HTTP responses using scripts:

```javascript
// Tests
pm.test("Status is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is valid JSON", function () {
    pm.response.to.be.json;
});

pm.test("Response has success field", function () {
    pm.expect(pm.response.json()).to.have.property("success");
});
```

---

## Monitoring & Logging

### View API Logs

```bash
# Watch logs in development
npm run dev

# Production logs (example with Vercel)
vercel logs
```

### Check Rate Limit Headers

```bash
curl -i -X GET "http://localhost:3000/api/tenders" \
  -H "Authorization: Bearer $TOKEN" | grep -i "X-RateLimit"
```

---

## Troubleshooting

### 401 Unauthorized

- [ ] Token is valid and not expired
- [ ] Token is included in Authorization header
- [ ] Use format: `Bearer {token}`, not just `{token}`

### 404 Not Found

- [ ] Resource ID is correct
- [ ] Resource belongs to your tenant
- [ ] Endpoint path has no typos

### 429 Rate Limited

- [ ] Wait for rate limit window (1 hour) or
- [ ] Reduce request frequency

### 400 Validation Error

- [ ] Check error `details` field for specific issues
- [ ] Ensure all required fields are present
- [ ] Validate data types (string, number, array, etc.)

---

## Performance Testing

### Load Testing with Apache Bench

```bash
ab -n 100 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/tenders
```

### Measure Response Times

```bash
curl -w "Time: %{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/tenders
```

---

For more information, see `docs/API_ENDPOINTS.md` and `docs/SECURITY_AND_ERROR_HANDLING.md`
