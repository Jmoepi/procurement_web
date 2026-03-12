# Security & Error Handling Implementation Guide

## Overview

This document outlines the security measures and error handling implemented for production readiness.

## 1. Security Implementation

### 1.1 Environment Variables

**Status**: ✅ Implemented

- **File**: `.env.example` (committed to git)
- **Config**: `.env` and `.env.local` (ignored by git)
- **Why**: API keys should NEVER be committed to version control

**Setup Steps**:
```bash
cp .env.example .env.local
# Edit .env.local with your actual credentials
```

**Best Practices**:
- Use `.env.local` for local development
- Use platform environment variables for production (Vercel, Railway, Docker, etc.)
- Never share `.env` files
- Rotate keys regularly
- Use strong secret keys (minimum 32 characters)

---

### 1.2 Rate Limiting

**Location**: `src/lib/rate-limiter.ts`

- Prevents API abuse and DDoS attacks
- Default: 100 requests per hour per user/IP
- Returns `429 Too Many Requests` when limit exceeded

**For Production**:
- Replace in-memory store with Redis
- Use Upstash or AWS ElastiCache for distributed systems
- Monitor rate limit hits for security alerts

---

### 1.3 CORS & CSRF Protection

**Location**: `src/middleware.ts` (CORS) | `src/lib/csrf.ts` (CSRF)

**Security Headers Added**:
- `X-Frame-Options`: Prevent clickjacking
- `X-Content-Type-Options`: Prevent MIME sniffing
- `X-XSS-Protection`: Additional XSS protection
- `Referrer-Policy`: Control referrer information
- `Content-Security-Policy`: Restrict resource loading
- `Permissions-Policy`: Disable dangerous APIs

**CORS Configuration**:
- Whitelist specific origins only
- Block cross-origin requests by default
- Support preflight OPTIONS requests

**CSRF Protection**:
- Token generation and validation
- 24-hour expiry on tokens
- Protects POST, PUT, PATCH, DELETE methods

---

### 1.4 API Validation

**Location**: `src/lib/api-errors.ts` | `src/app/api/*/route.ts`

**Implementation**:
- Zod schema validation for all inputs
- Standardized error responses
- Clear error codes and messages
- Error details in development, minimal in production

**Example**:
```typescript
const QuerySchema = z.object({
  limit: z.number().int().min(1).max(100),
  category: z.enum(["courier", "printing"]),
});
```

---

### 1.5 API Authentication

**Location**: `src/lib/api-auth.ts`

**Flow**:
1. Extract Bearer token from Authorization header
2. Verify token with Supabase
3. Load user profile and tenant info
4. Check permissions on protected operations

**Usage in Routes**:
```typescript
const { auth, response } = await requireAuth(request);
if (response) return response; // Return error if not authenticated
```

---

## 2. Error Handling Implementation

### 2.1 Global Error Boundary

**File**: `src/app/error.tsx`

**Features**:
- Catches all unhandled errors in the application
- Shows user-friendly error messages
- Provides "Try Again" button to reset component
- Logs errors for debugging (dev mode only)
- Error digest for support inquiries

---

### 2.2 404 Handler

**File**: `src/app/not-found.tsx`

**Features**:
- Handles non-existent routes
- Provides helpful suggestions
- Links to dashboard and search
- Consistent styling with the app

---

### 2.3 API Error Responses

**Format**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": [
      {
        "field": "limit",
        "message": "Number must be less than or equal to 100",
        "code": "too_big"
      }
    ]
  }
}
```

---

### 2.4 Health Check Endpoint

**URL**: `GET /api/health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-03-11T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "supabase": "connected"
  }
}
```

**Use Cases**:
- Deployment health checks
- Monitoring systems
- Load balancer checks

---

## 3. API Infrastructure

### 3.1 Example Endpoints Created

#### 3.1.1 GET /api/tenders

Lists tenders with filtering, pagination, and authentication.

**Parameters**:
- `category`: Filter by tender category
- `priority`: Filter by priority level
- `expired`: Filter for expired tenders
- `limit`: Results per page (max 100)
- `offset`: Pagination offset

**Authentication**: Bearer token required

**Rate Limit**: 100 per hour

---

#### 3.1.2 GET /api/sources

Lists data sources for the authenticated tenant.

**Authentication**: Bearer token required

**Rate Limit**: 100 per hour

---

#### 3.1.3 POST /api/sources

Creates a new data source with plan-based limits.

**Body**:
```json
{
  "name": "E-Tender Portal",
  "url": "https://example.com",
  "type": "portal",
  "crawl_frequency": "daily"
}
```

**Plan Limits**:
- Starter: 30 sources
- Pro: 150 sources
- Enterprise: Unlimited

---

## 4. Production Deployment Checklist

### Before Deploying:

- [ ] Update `.env` variables in production environment
- [ ] Set `NODE_ENV=production`
- [ ] Enable CORS for production domains
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure rate limiting with Redis
- [ ] Set up database backups
- [ ] Enable audit logging
- [ ] Run security audit (`npm audit`)
- [ ] Update CSRF secret to strong value

### Ongoing:

- [ ] Monitor `/api/health` with external service
- [ ] Review error logs daily
- [ ] Monitor rate limit hits
- [ ] Update dependencies regularly
- [ ] Conduct security audits quarterly

---

## 5. Adding New API Endpoints

### Template:

```typescript
// src/app/api/your-resource/route.ts

import { NextRequest } from "next/server";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limiter";
import { requireAuth } from "@/lib/api-auth";
import {
  createErrorResponse,
  createSuccessResponse,
  toNextResponse,
  API_ERRORS,
} from "@/lib/api-errors";

const rateLimiter = createRateLimiter(60 * 60 * 1000, 100);

const InputSchema = z.object({
  // Define your schema here
});

export async function GET(request: NextRequest) {
  // 1. Rate limit
  const clientId = getClientIdentifier(request);
  const rateLimit = rateLimiter(clientId);
  if (!rateLimit.allowed) {
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.RATE_LIMITED.code,
      "Too many requests",
      API_ERRORS.RATE_LIMITED.statusCode
    );
    return toNextResponse(errorData, statusCode);
  }

  // 2. Authenticate
  const { auth, response } = await requireAuth(request);
  if (response) return response;

  // 3. Your logic here
  
  // 4. Return response
  const responseData = createSuccessResponse(data);
  return toNextResponse(responseData, 200);
}
```

---

## 6. Testing Security

### Unit Tests:
```bash
npm test -- rate-limiter.test.ts
npm test -- csrf.test.ts
```

### Integration Tests:
```bash
npm test -- api.test.ts
```

### Manual Testing:
```bash
# Test rate limiting
for i in {1..101}; do curl http://localhost:3000/api/health; done

# Test authentication
curl -X GET http://localhost:3000/api/tenders # Should fail
curl -X GET http://localhost:3000/api/tenders \
  -H "Authorization: Bearer $TOKEN" # Should work
```

---

## 7. Monitoring & Alerts

### Key Metrics:
- API error rate (target: < 1%)
- Rate limit hits (investigate if > 10/day)
- Response time (target: < 200ms)
- Auth failure rate (investigate if > 5%)

### Setup:
- Use Sentry for error tracking
- Use Datadog for performance monitoring
- Set up alerts for critical errors

---

## 8. Next Steps

1. ✅ Security implementation complete
2. ✅ Error handling complete
3. ✅ API infrastructure started
4. ⏳ Write integration tests
5. ⏳ Create admin endpoints
6. ⏳ Set up monitoring/logging
7. ⏳ Prepare for deployment

---

For questions or issues, refer to the implementation files referenced above.
