# API Endpoints Documentation

## Authentication

All endpoints (except `/api/health`) require a Bearer token in the `Authorization` header:

```bash
Authorization: Bearer <your-token-here>
```

To get a token, authenticate via the web app login.

---

## Endpoints Overview

### Health Check
- `GET /api/health` - Check API health status

### Tenders
- `GET /api/tenders` - List tenders with filters
- `GET /api/tenders/{id}` - Get tender details

### Sources
- `GET /api/sources` - List data sources
- `POST /api/sources` - Create new source
- `PUT /api/sources/{id}` - Update source
- `DELETE /api/sources/{id}` - Delete source

### Subscribers
- `GET /api/subscribers` - List email subscribers
- `POST /api/subscribers` - Create new subscriber
- `PUT /api/subscribers/{id}` - Update subscriber
- `DELETE /api/subscribers/{id}` - Delete subscriber

### Digests
- `GET /api/digests` - List digest runs
- `GET /api/digests/{id}` - Get digest details
- `POST /api/digests/send` - Manually trigger digest

### Analytics
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/trends` - Tender trends over time

---

## Detailed Endpoints

### 1. Health Check

#### GET /api/health
Check if the API is running and services are available.

**No authentication required**

**Response (200 OK)**:
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

---

### 2. Tenders

#### GET /api/tenders
List tenders for the authenticated tenant.

**Query Parameters**:
- `category` (string, optional): Filter by category (`courier`, `printing`, `both`, `other`)
- `priority` (string, optional): Filter by priority (`high`, `medium`, `low`)
- `expired` (boolean, optional): Filter expired tenders
- `sourceId` (string UUID, optional): Filter by source
- `limit` (number, default: 20, max: 100): Results per page
- `offset` (number, default: 0): Pagination offset

**Example**:
```bash
curl -X GET "http://localhost:3000/api/tenders?category=courier&priority=high&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "tenders": [
      {
        "id": "uuid",
        "title": "Courier Services",
        "category": "courier",
        "priority": "high",
        "source_id": "uuid",
        "closing_date": "2026-03-15T23:59:59Z",
        "days_remaining": 4,
        "reference_number": "2026/001",
        "created_at": "2026-03-11T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 245,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### 3. Sources

#### GET /api/sources
List data sources for the tenant.

**Example**:
```bash
curl -X GET "http://localhost:3000/api/sources" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "id": "uuid",
        "name": "E-Tender Portal",
        "url": "https://etender.gov.za",
        "type": "portal",
        "enabled": true,
        "tenders_found": 1250,
        "last_crawled_at": "2026-03-11T05:00:00Z",
        "crawl_success_rate": 98.5
      }
    ],
    "count": 5
  }
}
```

#### POST /api/sources
Create a new data source.

**Request Body**:
```json
{
  "name": "New Source",
  "url": "https://example.com/tenders",
  "type": "portal",
  "requires_js": false,
  "crawl_frequency": "daily",
  "categories": ["courier", "printing"]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "name": "New Source",
    "url": "https://example.com/tenders",
    "type": "portal",
    "enabled": true,
    "crawl_frequency": "daily",
    "created_at": "2026-03-11T10:30:00Z"
  }
}
```

#### PUT /api/sources/{id}
Update a data source.

**Request Body**: (all fields optional)
```json
{
  "name": "Updated Name",
  "enabled": false,
  "crawl_frequency": "weekly"
}
```

#### DELETE /api/sources/{id}
Delete a data source.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

### 4. Subscribers

#### GET /api/subscribers
List email subscribers.

**Query Parameters**:
- `limit` (number, default: 20, max: 100)
- `offset` (number, default: 0)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "subscribers": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "preferences": {
          "categories": ["courier", "printing"]
        },
        "is_active": true,
        "created_at": "2026-03-10T15:00:00Z"
      }
    ],
    "pagination": {
      "total": 15,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

#### POST /api/subscribers
Create a new subscriber.

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "name": "Jane Doe",
  "categories": ["courier", "printing"],
  "is_active": true
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newuser@example.com",
    "name": "Jane Doe",
    "preferences": {
      "categories": ["courier", "printing"]
    },
    "is_active": true,
    "created_at": "2026-03-11T10:35:00Z"
  }
}
```

#### PUT /api/subscribers/{id}
Update a subscriber.

**Request Body**: (all fields optional)
```json
{
  "name": "John Smith",
  "categories": ["printing", "logistics"],
  "is_active": true
}
```

#### DELETE /api/subscribers/{id}
Delete a subscriber.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

### 5. Digests

#### GET /api/digests
List digest runs.

**Query Parameters**:
- `limit` (number, default: 20, max: 100)
- `offset` (number, default: 0)
- `status` (string, optional): Filter by status (`success`, `fail`, `pending`)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "digests": [
      {
        "id": "uuid",
        "status": "success",
        "sent_count": 12,
        "tenders_included": ["uuid1", "uuid2"],
        "error_message": null,
        "created_at": "2026-03-11T08:00:00Z"
      }
    ],
    "pagination": {
      "total": 42,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

#### GET /api/digests/{id}
Get digest details with included tenders.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "digest": {
      "id": "uuid",
      "status": "success",
      "sent_count": 12,
      "created_at": "2026-03-11T08:00:00Z"
    },
    "tenders": [
      {
        "id": "uuid",
        "title": "Courier Services",
        "category": "courier",
        "priority": "high"
      }
    ],
    "summary": {
      "total_tenders": 15,
      "by_category": {
        "courier": 8,
        "printing": 7
      },
      "by_priority": {
        "high": 5,
        "medium": 10
      }
    }
  }
}
```

#### POST /api/digests/send
Manually trigger a digest send.

**Response (202 Accepted)**:
```json
{
  "success": true,
  "data": {
    "digest": {
      "id": "uuid",
      "status": "pending",
      "created_at": "2026-03-11T10:40:00Z"
    },
    "message": "Digest send triggered. Check back soon for results."
  }
}
```

---

### 6. Analytics

#### GET /api/analytics/dashboard
Get dashboard statistics.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_tenders": 1250,
      "active_tenders": 892,
      "expired_tenders": 358,
      "active_subscribers": 12,
      "plan": "pro",
      "trial_ends_at": null
    },
    "breakdown": {
      "by_category": {
        "courier": 450,
        "printing": 380,
        "logistics": 220,
        "other": 200
      },
      "by_priority": {
        "high": 350,
        "medium": 620,
        "low": 280
      }
    },
    "top_sources": [
      {
        "id": "uuid",
        "name": "E-Tender",
        "tenders_found": 450
      }
    ],
    "recent_tenders": [
      {
        "id": "uuid",
        "title": "Courier Services",
        "category": "courier",
        "priority": "high",
        "created_at": "2026-03-11T08:00:00Z"
      }
    ],
    "charts_data": {
      "categories": [
        { "name": "courier", "value": 450 },
        { "name": "printing", "value": 380 }
      ],
      "priorities": [
        { "name": "high", "value": 350 },
        { "name": "medium", "value": 620 }
      ]
    }
  }
}
```

#### GET /api/analytics/trends
Get tender trends over time.

**Query Parameters**:
- `days` (number, default: 30, max: 365): Time period in days
- `groupBy` (string, default: 'day'): Group by `day`, `week`, or `month`

**Example**:
```bash
curl -X GET "http://localhost:3000/api/analytics/trends?days=30&groupBy=day" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "metadata": {
      "days": 30,
      "groupBy": "day",
      "startDate": "2026-02-09T10:40:00Z",
      "endDate": "2026-03-11T10:40:00Z",
      "total_tenders": 285
    },
    "timeline": [
      {
        "period": "2026-02-09",
        "total": 12,
        "categories": {
          "courier": 6,
          "printing": 4,
          "other": 2
        },
        "priorities": {
          "high": 3,
          "medium": 7,
          "low": 2
        }
      }
    ],
    "summary": {
      "average_per_period": 9.5,
      "peak_period": "2026-03-08",
      "peak_count": 18
    }
  }
}
```

---

## Error Responses

All endpoints return error responses in this format:

**400 Bad Request** (Validation Error):
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

**401 Unauthorized**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required. Please provide a valid Bearer token."
  }
}
```

**403 Forbidden**:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required"
  }
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

**429 Too Many Requests** (Rate Limited):
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later."
  }
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error"
  }
}
```

---

## Rate Limiting

All endpoints are rate limited to **100 requests per hour** per user/IP.

Rate limit information is returned in response headers:
- `X-RateLimit-Remaining`: Number of requests remaining
- `X-RateLimit-Reset`: Unix timestamp of when the rate limit resets

---

## Common Query Parameters

Most list endpoints support these parameters:
- `limit` (number, default: 20, max: 100): Results per page
- `offset` (number, default: 0): Pagination offset

---

## Best Practices

1. **Pagination**: Always implement pagination for list endpoints to avoid timeout
2. **Caching**: Cache frequently accessed data (e.g., sources list) for 5-10 minutes
3. **Error Handling**: Always check the `success` field and handle errors gracefully
4. **Rate Limiting**: Implement exponential backoff when hitting rate limits
5. **Validation**: Validate all inputs before sending to API
6. **Secrets**: Never expose your Bearer token in client-side code

---

For more information, see `docs/SECURITY_AND_ERROR_HANDLING.md`
