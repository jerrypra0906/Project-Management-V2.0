# CR List OpenAPI — Integration Guide

This application is the **API Provider**. External systems integrating with it are **API Consumers**.

The integration surface is focused on **CR (Change Request)** data aligned with the **CR List** page: read/list and partial update.

**Spec version 1.1** — CR milestone phases now include `Live (Warranty Period)` and `Fully Live` (replacing the former single `Live` phase). See [CR milestone phase values](#cr-milestone-phase-values).

| Resource | Location |
|----------|----------|
| OpenAPI 3.0 spec | [`docs/openapi-cr-list.yaml`](openapi-cr-list.yaml) |
| Route implementation | [`backend/routes/api-v1-crs.js`](../backend/routes/api-v1-crs.js) |
| Client token | [`backend/routes/auth.js`](../backend/routes/auth.js) (`POST /api/auth/client-token`) |
| API client admin | [`backend/routes/admin.js`](../backend/routes/admin.js) (`POST /api/admin/api-clients`) |
| Smoke tests | [`tests/cr-list-openapi-smoke.http`](../tests/cr-list-openapi-smoke.http) |

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Local backend | `http://localhost:3000` |
| Local via frontend proxy | `http://localhost:8080` |

All paths below are relative to the base URL.

---

## Authentication overview

1. **Provider (admin)** creates an API client with `clientId`, `clientSecret`, and scopes.
2. **Consumer** exchanges credentials for a JWT at `POST /api/auth/client-token`.
3. **Consumer** calls CR APIs with `Authorization: Bearer <access_token>`.

| Scope | Required for |
|-------|----------------|
| `cr:read` | `POST /api/v1/crs/list` |
| `cr:write` | `PATCH /api/v1/crs/{id}` |

Default scope string when creating a client: `cr:read cr:write` (space-separated).

Token lifetime: **30 minutes** (`expires_in: 1800` seconds).

### End-to-end use case diagram (all APIs)

```mermaid
usecaseDiagram
  left to right direction

  actor "Admin User" as Admin
  actor "API Consumer\n(External System)" as Consumer

  rectangle "Project Management Tools\n(API Provider)" {
    usecase "UC1\nCreate API Client" as UC1
    usecase "UC2\nObtain Access Token" as UC2
    usecase "UC3\nList CRs" as UC3
    usecase "UC4\nUpdate CR" as UC4
  }

  Admin --> UC1
  Consumer --> UC2
  Consumer --> UC3
  Consumer --> UC4

  UC2 ..> UC1 : <<include>>\nclient must exist
  UC3 ..> UC2 : <<include>>\nBearer + cr:read
  UC4 ..> UC2 : <<include>>\nBearer + cr:write
```

| Step | API | Actor | Typical goal |
|------|-----|-------|----------------|
| 1 | `POST /api/admin/api-clients` | Admin | Register integration credentials (one-time setup) |
| 2 | `POST /api/auth/client-token` | API Consumer | Get JWT before each session / on expiry |
| 3 | `POST /api/v1/crs/list` | API Consumer | Read or sync CR List data |
| 4 | `PATCH /api/v1/crs/{id}` | API Consumer | Push status, milestone, or dates from external tool |

---

## Common headers

| Header | Required | Type | Length | Validation |
|--------|----------|------|--------|------------|
| `Authorization` | Yes (CR APIs) | string | — | Format: `Bearer <JWT>`. Missing or invalid token → **401**. |
| `Content-Type` | Yes (bodies) | string | — | Must be `application/json` for POST/PATCH with body. |
| `X-Request-Id` | No | string | 1–128 recommended | Optional correlation ID. Echoed on response when provided. |

### CR API timeout (Provider)

Routes under `/api/v1/crs/*` use a **5 second** server timeout.

| HTTP status | When |
|-------------|------|
| **504** | Processing exceeds 5000 ms. Body: `{ "error": "Request exceeded 5000ms timeout" }` |
| Response header | `X-Response-Time-Ms` — elapsed milliseconds (on successful completion) |

---

## 1. Create API client (Provider / Admin)

Used once per integration. Requires an **admin user** session token (normal login), not a client-credentials token.

| | |
|--|--|
| **Method / path** | `POST /api/admin/api-clients` |
| **Auth** | `Authorization: Bearer <admin_user_jwt>` |

### Use case diagram

```mermaid
usecaseDiagram
  left to right direction

  actor "Admin User" as Admin

  rectangle "POST /api/admin/api-clients" {
    usecase "Register API integration" as UC_REG
    usecase "Assign OAuth scopes\n(cr:read, cr:write)" as UC_SCOPE
    usecase "Store client secret\n(bcrypt hash)" as UC_SECRET
    usecase "Enable or disable client" as UC_ACTIVE
  }

  Admin --> UC_REG
  UC_REG ..> UC_SCOPE : include
  UC_REG ..> UC_SECRET : include
  UC_REG ..> UC_ACTIVE : include

  note right of UC_REG
    Success: 201 + client id
    Duplicate clientId: 409
  end note
```

| Use case | Description |
|----------|-------------|
| Register API integration | Admin creates a named integration with unique `clientId`. |
| Assign scopes | Defines what the consumer may do (`cr:read`, `cr:write`). |
| Store client secret | Plain secret is hashed; never returned again in API responses. |
| Enable or disable client | `active: false` blocks token issuance later. |

### Request payload

```json
{
  "name": "My Integration",
  "clientId": "my-integration-app",
  "clientSecret": "REPLACE_WITH_STRONG_SECRET",
  "scopes": "cr:read cr:write",
  "active": true
}
```

| Field | Type | Length | Required | Validation |
|-------|------|--------|----------|------------|
| `name` | string | 1–255 recommended | Yes | Non-empty display name for the integration. |
| `clientId` | string | 3–64 recommended | Yes | Unique client identifier; compared case-insensitively. Duplicate → **409** `{ "error": "clientId already exists" }`. |
| `clientSecret` | string | 16+ recommended | Yes | Plain text secret; stored as bcrypt hash. Shown only at creation time. |
| `scopes` | string | — | No | Space-separated scopes. Default: `cr:read cr:write`. |
| `active` | boolean | — | No | Default `true`. If `false`, client-token returns **401**. |

### Success response (`201 Created`)

```json
{
  "ok": true,
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Length | Validation |
|-------|------|--------|------------|
| `ok` | boolean | — | Always `true` on success. |
| `id` | string (UUID) | 36 | Internal API client record ID. |

### Error responses

| Status | Body example | Cause |
|--------|--------------|-------|
| 400 | `{ "error": "name, clientId and clientSecret are required" }` | Missing required fields |
| 401/403 | `{ "error": "..." }` | Not authenticated / not admin |
| 409 | `{ "error": "clientId already exists" }` | Duplicate `clientId` |
| 500 | `{ "error": "Internal error" }` | Server error |

---

## 2. Obtain access token (API Consumer)

| | |
|--|--|
| **Method / path** | `POST /api/auth/client-token` |
| **Auth** | None |

### Use case diagram

```mermaid
usecaseDiagram
  left to right direction

  actor "API Consumer" as Consumer

  rectangle "POST /api/auth/client-token" {
    usecase "Submit client credentials" as UC_SUBMIT
    usecase "Validate clientId\nand secret" as UC_VALIDATE
    usecase "Issue JWT access token" as UC_TOKEN
    usecase "Return scopes and expiry" as UC_META
  }

  Consumer --> UC_SUBMIT
  UC_SUBMIT ..> UC_VALIDATE : include
  UC_VALIDATE ..> UC_TOKEN : include
  UC_TOKEN ..> UC_META : include

  note right of UC_VALIDATE
    Invalid or inactive: 401
    Missing fields: 400
    Token TTL: 30 minutes
  end note
```

| Use case | Description |
|----------|-------------|
| Submit client credentials | Consumer sends `clientId` + `clientSecret` (no user password). |
| Validate clientId and secret | Provider checks record exists, `active`, and bcrypt secret. |
| Issue JWT access token | Short-lived Bearer token for CR APIs. |
| Return scopes and expiry | Consumer knows granted scopes and when to refresh (`expires_in`). |

### Request payload

```json
{
  "clientId": "my-integration-app",
  "clientSecret": "REPLACE_WITH_STRONG_SECRET"
}
```

| Field | Type | Length | Required | Validation |
|-------|------|--------|----------|------------|
| `clientId` | string | 3–64 recommended | Yes | Must match an active API client. |
| `clientSecret` | string | — | Yes | Must match stored secret (bcrypt verify). |

### Success response (`200 OK`)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 1800,
  "scope": "cr:read cr:write"
}
```

| Field | Type | Length | Validation |
|-------|------|--------|------------|
| `access_token` | string | — | JWT; use as Bearer token. |
| `token_type` | string | — | Always `Bearer`. |
| `expires_in` | integer | — | Seconds until expiry (1800 = 30 min). |
| `scope` | string | — | Granted scopes from API client record. |

### Error responses

| Status | Body example | Cause |
|--------|--------------|-------|
| 400 | `{ "error": "clientId and clientSecret are required" }` | Missing fields |
| 401 | `{ "error": "Invalid client credentials" }` | Unknown client, inactive client, or wrong secret |
| 500 | `{ "error": "Internal error" }` | Server error |

---

## 3. List CRs

Returns paginated CR initiatives (`type = "CR"`) with optional nested `cr` change-request dates.

| | |
|--|--|
| **Method / path** | `POST /api/v1/crs/list` |
| **Auth** | `Bearer` token with scope **`cr:read`** |
| **Body** | Optional (empty `{}` is valid) |

### Use case diagram

```mermaid
usecaseDiagram
  left to right direction

  actor "API Consumer" as Consumer

  rectangle "POST /api/v1/crs/list" {
    usecase "Authenticate with Bearer token" as UC_AUTH
    usecase "Search CRs by text (q)" as UC_SEARCH
    usecase "Filter by status, priority,\nmilestone, department, etc." as UC_FILTER
    usecase "Filter by impacted\nDWS application" as UC_DWS
    usecase "Exclude NOT STARTED\n(active filter)" as UC_ACTIVE
    usecase "Sort and paginate results" as UC_PAGE
    usecase "Return CR records\nwith nested cr dates" as UC_RETURN
  }

  Consumer --> UC_SEARCH
  Consumer --> UC_FILTER
  Consumer --> UC_DWS
  Consumer --> UC_ACTIVE
  Consumer --> UC_PAGE

  UC_SEARCH ..> UC_AUTH : include
  UC_FILTER ..> UC_AUTH : include
  UC_DWS ..> UC_AUTH : include
  UC_ACTIVE ..> UC_AUTH : include
  UC_PAGE ..> UC_AUTH : include
  UC_SEARCH ..> UC_RETURN : include
  UC_FILTER ..> UC_RETURN : include
  UC_PAGE ..> UC_RETURN : include

  note bottom of UC_RETURN
    5s timeout → 504
    Missing cr:read → 403
  end note
```

| Use case | Description |
|----------|-------------|
| Search CRs by text | Match `name`, `description`, or `ticket` (case-insensitive). |
| Filter by dimensions | Multi-value filters on status, priority, milestone, owners, department. |
| Filter by impacted DWS application | Any-of match on `systemImpactedIds`. |
| Exclude NOT STARTED | `filters.active: true` hides not-started CRs. |
| Sort and paginate | `sort.field` / `direction`, `page`, `pageSize` (max 500). |
| Return CR records with nested cr dates | Each item includes initiative fields + optional `cr` date block. |

**Typical consumer scenarios**

| Scenario | Filters / options used |
|----------|-------------------------|
| Nightly sync to data warehouse | `page` / `pageSize`, `sort.updatedAt desc` |
| Portal showing open CRs for one app | `systemImpactedId`, `active: true` |
| Operations dashboard by status | `status: ["ON TRACK","AT RISK","DELAYED"]` |

### Request payload (full example)

```json
{
  "q": "payment",
  "filters": {
    "status": ["LIVE", "DELAYED"],
    "priority": ["P0", "P1"],
    "milestone": ["SIT", "UAT"],
    "departmentId": ["dept-uuid-1"],
    "itPicId": ["user-uuid-1"],
    "itPmId": ["user-uuid-2"],
    "businessOwnerId": ["user-uuid-3"],
    "systemImpactedId": ["dws-app-uuid-1", "dws-app-uuid-2"],
    "active": true
  },
  "page": 1,
  "pageSize": 100,
  "sort": {
    "field": "updatedAt",
    "direction": "desc"
  }
}
```

### Request fields — root

| Field | Type | Length | Required | Validation |
|-------|------|--------|----------|------------|
| `q` | string | — | No | Case-insensitive search in `name`, `description`, `ticket`. |
| `filters` | object | — | No | See table below. Omitted = no filter on that dimension. |
| `page` | integer | — | No | Default `1`. Coerced with `Math.max(1, page)`. |
| `pageSize` | integer | — | No | Default `100`. Min `1`, max `500` (values above 500 are capped). |
| `sort` | object | — | No | See sort table below. |

### Request fields — `filters`

| Field | Type | Length | Required | Validation |
|-------|------|--------|----------|------------|
| `filters.status` | string[] | — | No | Each value uppercased for match. Match is **exact** against CR `status` (after uppercase). Recommended values: see [CR status values](#cr-status-values). |
| `filters.priority` | string[] | — | No | Each value uppercased. Exact match. Recommended: `P0`, `P1`, `P2`. |
| `filters.milestone` | string[] | — | No | Match on initiative `milestone` after **normalization**. Filter `Live` matches both legacy `Live` and `Live (Warranty Period)`. Use exact labels from [CR milestone phase values](#cr-milestone-phase-values). |
| `filters.departmentId` | string[] | — | No | Exact match on `departmentId` (user/department UUID). |
| `filters.itPicId` | string[] | — | No | Exact match on primary `itPicId`. |
| `filters.itPmId` | string[] | — | No | Exact match on `itPmId`. |
| `filters.businessOwnerId` | string[] | — | No | Exact match on `businessOwnerId`. |
| `filters.systemImpactedId` | string[] | — | No | **Any-of** match: CR included if any listed DWS application ID appears in `systemImpactedIds`. Alias: `systemImpactedIds` (same behavior). |
| `filters.active` | boolean | — | No | If `true`, excludes CRs with status `NOT STARTED` (case-insensitive). |

### Request fields — `sort`

| Field | Type | Length | Required | Validation |
|-------|------|--------|----------|------------|
| `sort.field` | string | — | No | Initiative property name. Default `updatedAt`. Examples: `name`, `ticket`, `status`, `priority`, `planEndDate`, `createdAt`. |
| `sort.direction` | string | — | No | `asc` or `desc` (case-insensitive). Default `desc`. |

### Success response (`200 OK`)

```json
{
  "items": [
    {
      "id": "initiative-uuid",
      "type": "CR",
      "name": "CR - Payment gateway enhancement",
      "ticket": "CR01052026001",
      "description": "Enhance payment flow",
      "businessImpact": "Revenue impact",
      "priority": "P0",
      "businessOwnerId": "user-uuid",
      "businessUserIds": ["user-uuid-a", "user-uuid-b"],
      "departmentId": "dept-uuid",
      "itPicId": "user-uuid",
      "itPicIds": ["user-uuid"],
      "itPmId": "user-uuid",
      "itManagerIds": ["user-uuid"],
      "systemImpactedIds": ["dws-app-uuid-1"],
      "status": "On Track",
      "milestone": "SIT",
      "startDate": "2026-04-01",
      "endDate": null,
      "planStartDate": "2026-03-15",
      "planEndDate": "2026-05-20",
      "remark": null,
      "documentationLink": "https://example.com/doc",
      "createdAt": "2026-03-01T08:00:00.000Z",
      "updatedAt": "2026-05-10T12:30:00.000Z",
      "cr": {
        "initiativeId": "initiative-uuid",
        "crSubmissionStart": "2026-03-01",
        "crSubmissionEnd": "2026-03-10",
        "developmentStart": "2026-03-11",
        "developmentEnd": "2026-04-20",
        "sitStart": "2026-04-21",
        "sitEnd": "2026-05-05",
        "uatStart": "2026-05-06",
        "uatEnd": "2026-05-15",
        "liveDate": null
      }
    }
  ],
  "page": 1,
  "pageSize": 100,
  "total": 1
}
```

### Response fields — pagination

| Field | Type | Length | Validation |
|-------|------|--------|------------|
| `items` | array | — | Array of CR objects (see below). |
| `page` | integer | — | Current page (echo of request, after normalization). |
| `pageSize` | integer | — | Page size used (capped at 500). |
| `total` | integer | — | Total CRs matching filters **before** pagination. |

### Response fields — each item in `items` (initiative)

| Field | Type | Length | Validation |
|-------|------|--------|------------|
| `id` | string (UUID) | 36 | Initiative primary key. |
| `type` | string | 2 | Always `"CR"` for this API. |
| `name` | string | TEXT | CR title. |
| `ticket` | string \| null | TEXT | Auto-generated ticket, e.g. `CR01052026001` (CR + DDMMYYYY + 3-digit run). |
| `description` | string \| null | TEXT | Free text. |
| `businessImpact` | string \| null | TEXT | Business impact statement. |
| `priority` | string \| null | 2 | `P0`, `P1`, or `P2`. |
| `businessOwnerId` | string \| null | 36 | User UUID. |
| `businessUserIds` | string[] | — | User UUIDs (parsed from stored CSV in DB). |
| `departmentId` | string \| null | 36 | Department UUID. |
| `itPicId` | string \| null | 36 | Primary IT PIC user UUID. |
| `itPicIds` | string[] | — | IT PIC user UUIDs. |
| `itPmId` | string \| null | 36 | IT PM user UUID. |
| `itManagerIds` | string[] | — | IT Manager user UUIDs. |
| `systemImpactedIds` | string[] | — | Master DWS Application IDs. |
| `status` | string \| null | — | See [CR status values](#cr-status-values). |
| `milestone` | string \| null | — | Canonical CR phase label. Legacy stored `Live` is returned as `Live (Warranty Period)`. See [CR milestone phase values](#cr-milestone-phase-values). |
| `startDate` | string \| null | 10–30 | ISO date `YYYY-MM-DD` or ISO 8601 datetime. |
| `endDate` | string \| null | 10–30 | Actual end date. Required in UI/API when `status` is `Live` and `milestone` is `Fully Live`. |
| `planStartDate` | string \| null | 10–30 | Planned start. |
| `planEndDate` | string \| null | 10–30 | Planned end. |
| `remark` | string \| null | TEXT | Remarks. |
| `documentationLink` | string \| null | TEXT | URL or link to documentation. |
| `createdAt` | string \| null | — | ISO 8601 timestamp. |
| `updatedAt` | string \| null | — | ISO 8601 timestamp. |
| `cr` | object \| null | — | Nested change-request dates (see below). |

### Response fields — `cr` object (nested)

| Field | Type | Length | Validation |
|-------|------|--------|------------|
| `cr.initiativeId` | string (UUID) | 36 | Same as parent initiative `id`. |
| `cr.crSubmissionStart` | string \| null | 10–30 | CR submission window start. |
| `cr.crSubmissionEnd` | string \| null | 10–30 | CR submission window end. |
| `cr.developmentStart` | string \| null | 10–30 | Development phase start. |
| `cr.developmentEnd` | string \| null | 10–30 | Development phase end. |
| `cr.sitStart` | string \| null | 10–30 | SIT start. |
| `cr.sitEnd` | string \| null | 10–30 | SIT end. |
| `cr.uatStart` | string \| null | 10–30 | UAT start. |
| `cr.uatEnd` | string \| null | 10–30 | UAT end. |
| `cr.liveDate` | string \| null | 10–30 | Live / go-live date. |

If no `changeRequests` row exists for the initiative, `cr` may be `null`.

### List API errors

| Status | Cause |
|--------|-------|
| 401 | Missing/invalid Bearer token |
| 403 | Token missing `cr:read` scope (client credentials) |
| 504 | Exceeded 5s timeout |

---

## 4. Update CR (partial)

Partial update of a single CR initiative and optional nested `cr` date fields. Only properties **sent in the body** are updated.

| | |
|--|--|
| **Method / path** | `PATCH /api/v1/crs/{id}` |
| **Auth** | `Bearer` token with scope **`cr:write`** |
| **Path `id`** | Initiative UUID |

### Use case diagram

```mermaid
usecaseDiagram
  left to right direction

  actor "API Consumer" as Consumer

  rectangle "PATCH /api/v1/crs/{id}" {
    usecase "Authenticate with Bearer token" as UC_AUTH
    usecase "Resolve CR by initiative id" as UC_RESOLVE
    usecase "Partial update initiative fields" as UC_INIT
    usecase "Update status and milestone" as UC_STATUS
    usecase "Update plan and actual dates" as UC_DATES
    usecase "Update systemImpactedIds" as UC_SYSTEMS
    usecase "Partial update cr phase dates" as UC_CR
    usecase "Persist and set updatedAt" as UC_SAVE
  }

  Consumer --> UC_STATUS
  Consumer --> UC_DATES
  Consumer --> UC_SYSTEMS
  Consumer --> UC_CR

  UC_STATUS ..> UC_AUTH : include
  UC_STATUS ..> UC_RESOLVE : include
  UC_STATUS ..> UC_INIT : include
  UC_DATES ..> UC_INIT : include
  UC_SYSTEMS ..> UC_INIT : include
  UC_CR ..> UC_RESOLVE : include
  UC_INIT ..> UC_SAVE : include
  UC_CR ..> UC_SAVE : include

  note right of UC_RESOLVE
    Not found: 404
    Not type CR: 400
    Missing cr:write: 403
  end note
```

| Use case | Description |
|----------|-------------|
| Resolve CR by initiative id | Path parameter `id` must be an existing initiative with `type = CR`. |
| Partial update initiative fields | Only keys sent in the JSON body are changed. |
| Update status and milestone | Sync workflow state from ITSM / external tracker. |
| Update plan and actual dates | Align `planStartDate`, `planEndDate`, `startDate`, `endDate`. |
| Update systemImpactedIds | Link CR to Master DWS applications. |
| Partial update cr phase dates | Update nested `cr` object (SIT/UAT/live dates, etc.). |
| Persist and set updatedAt | Server writes store and stamps `updatedAt` to now. |

**Typical consumer scenarios**

| Scenario | Fields commonly sent |
|----------|----------------------|
| ITSM ticket closed → warranty period | `status: "Live"`, `milestone: "Live (Warranty Period)"`, `endDate`, `cr.liveDate` |
| CR past warranty → fully live | `status: "Live"`, `milestone: "Fully Live"`, **`endDate` required** |
| Test tool finished SIT | `cr.sitStart`, `cr.sitEnd`, `milestone: "UAT"` |
| Architecture review updates apps | `systemImpactedIds` |

### Request payload (full example)

```json
{
  "ticket": "CR01052026001",
  "name": "CR - Payment gateway enhancement",
  "description": "Updated scope for payment flow",
  "businessImpact": "Revenue and compliance",
  "priority": "P0",
  "businessOwnerId": "user-uuid",
  "businessUserIds": ["user-uuid-a", "user-uuid-b"],
  "departmentId": "dept-uuid",
  "itPicId": "user-uuid",
  "itPicIds": ["user-uuid"],
  "itPmId": "user-uuid",
  "itManagerIds": ["user-uuid"],
  "systemImpactedIds": ["dws-app-uuid-1", "dws-app-uuid-2"],
  "status": "On Track",
  "milestone": "SIT",
  "startDate": "2026-04-01",
  "endDate": null,
  "planStartDate": "2026-03-15",
  "planEndDate": "2026-05-20",
  "remark": "Integration sync",
  "documentationLink": "https://example.com/doc",
  "cr": {
    "crSubmissionStart": "2026-03-01",
    "crSubmissionEnd": "2026-03-10",
    "developmentStart": "2026-03-11",
    "developmentEnd": "2026-04-20",
    "sitStart": "2026-05-10",
    "sitEnd": "2026-05-18",
    "uatStart": null,
    "uatEnd": null,
    "liveDate": null
  }
}
```

### Request fields — initiative (all optional; partial update)

| Field | Type | Length | Required | Validation |
|-------|------|--------|----------|------------|
| `ticket` | string \| null | TEXT | No | CR ticket number. |
| `name` | string | TEXT | No | If sent, updates name (not trimmed by API). |
| `description` | string \| null | TEXT | No | |
| `businessImpact` | string \| null | TEXT | No | |
| `priority` | string | 2 | No | Recommended: `P0`, `P1`, `P2`. UI validation uses exact enum; API stores value as sent. |
| `businessOwnerId` | string \| null | 36 | No | User UUID. |
| `businessUserIds` | string[] | — | No | Array of user UUIDs. Non-array scalar coerced to single-element array. |
| `departmentId` | string \| null | 36 | No | Department UUID. |
| `itPicId` | string \| null | 36 | No | |
| `itPicIds` | string[] | — | No | Array of user UUIDs. Non-array scalar coerced to single-element array. |
| `itPmId` | string \| null | 36 | No | |
| `itManagerIds` | string[] | — | No | Array of user UUIDs. Non-array scalar coerced to single-element array. |
| `systemImpactedIds` | string[] | — | No | DWS application UUIDs. Stored as provided (array). |
| `status` | string | — | No | Recommended: see [CR status values](#cr-status-values). |
| `milestone` | string | — | No | Valid CR phase; see [CR milestone phase values](#cr-milestone-phase-values). Legacy `Live` accepted → stored as `Live (Warranty Period)`. Invalid value → **400**. |
| `startDate` | string \| null | 10–30 | No | ISO date or datetime string. |
| `endDate` | string \| null | 10–30 | No | Actual end date. **Required** when resulting `status` is `Live` and `milestone` is `Fully Live` (send in same PATCH or ensure already set). |
| `planStartDate` | string \| null | 10–30 | No | |
| `planEndDate` | string \| null | 10–30 | No | |
| `remark` | string \| null | TEXT | No | |
| `documentationLink` | string \| null | TEXT | No | |

**Note:** The OpenAPI schema sets `additionalProperties: false`. The server **ignores** unknown top-level keys (does not reject the request).

### Request fields — `cr` object (optional partial update)

Only keys present under `cr` are updated. If no change-request row exists, one is created for the initiative.

| Field | Type | Length | Required | Validation |
|-------|------|--------|----------|------------|
| `cr.crSubmissionStart` | string \| null | 10–30 | No | Date string. |
| `cr.crSubmissionEnd` | string \| null | 10–30 | No | |
| `cr.developmentStart` | string \| null | 10–30 | No | |
| `cr.developmentEnd` | string \| null | 10–30 | No | |
| `cr.sitStart` | string \| null | 10–30 | No | |
| `cr.sitEnd` | string \| null | 10–30 | No | |
| `cr.uatStart` | string \| null | 10–30 | No | |
| `cr.uatEnd` | string \| null | 10–30 | No | |
| `cr.liveDate` | string \| null | 10–30 | No | |

### Success response (`200 OK`)

```json
{
  "ok": true
}
```

| Field | Type | Length | Validation |
|-------|------|--------|------------|
| `ok` | boolean | — | Always `true` on success. |

On success, `updatedAt` on the initiative is set to current ISO timestamp server-side.

### Update API errors

| Status | Body example | Cause |
|--------|--------------|-------|
| 400 | `{ "error": "Not a CR initiative" }` | Initiative exists but `type` is not `CR` |
| 400 | `{ "error": "Invalid CR milestone phase" }` | Unknown `milestone` value |
| 400 | `{ "error": "Missing required field: endDate (required when Status is Live and Milestone is Fully Live)" }` | `status` + `milestone` = Live + Fully Live without `endDate` |
| 401 | `{ "error": "..." }` | Invalid/missing token |
| 403 | `{ "error": "Insufficient scope" }` | Missing `cr:write` |
| 404 | `{ "error": "Not found" }` | Unknown `id` |
| 500 | `{ "error": "..." }` | Server/store error (e.g. database write failure) |
| 504 | `{ "error": "Request exceeded 5000ms timeout" }` | Timeout |

---

## Canonical value lists

Use these values for consistency with the CR List UI and initiative validation (`validateCommon` in the web app).

### CR status values

| Value | Notes |
|-------|--------|
| `Not Started` | |
| `On Hold` | |
| `On Track` | |
| `At Risk` | |
| `Delayed` | |
| `Live` | |
| `Cancelled` | |

**List filter:** values are normalized to **UPPERCASE** before match. Sending `"LIVE"` or `"live"` in filters both match stored status when compared uppercase.

### CR priority values

| Value |
|-------|
| `P0` |
| `P1` |
| `P2` |

### CR milestone phase values

Stored in initiative `milestone` for `type = CR` (aligned with CR List UI and Milestone Distribution):

| Value | Notes |
|-------|--------|
| `User Initiate` | |
| `CR Created` | |
| `CR Signed sec 2` | |
| `CR Signed Sec 3` | |
| `FSD` | |
| `Development` | |
| `Changes` | |
| `Signed Changes` | |
| `Development - Extended` | |
| `SIT` | |
| `UAT` | |
| `Live (Warranty Period)` | Replaces former `Live` for CRs in warranty period |
| `Fully Live` | Post-warranty / fully live; requires `endDate` when `status` is `Live` |

**Legacy value `Live`**

| Context | Behavior |
|---------|----------|
| **PATCH request** | Accepted; persisted as `Live (Warranty Period)` |
| **List response** | Always returned as `Live (Warranty Period)` (never raw `Live`) |
| **List filter** | Filter `Live` or `Live (Warranty Period)` both match warranty-period CRs |

**List filter:** use exact labels above (case-sensitive). Filter matching applies normalization (legacy `Live` ↔ `Live (Warranty Period)`).

**Business rule (PATCH and web UI):** when `status` is `Live` and `milestone` is `Fully Live`, `endDate` (Actual End Date) must be set.

---

## Minimal integration flow (example)

### Step A — Get token

```http
POST /api/auth/client-token HTTP/1.1
Content-Type: application/json
X-Request-Id: corr-001

{
  "clientId": "my-integration-app",
  "clientSecret": "REPLACE_WITH_STRONG_SECRET"
}
```

### Step B — List active CRs

```http
POST /api/v1/crs/list HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Request-Id: corr-002

{
  "filters": {
    "systemImpactedId": ["dws-app-uuid-1"],
    "active": true
  },
  "page": 1,
  "pageSize": 50,
  "sort": { "field": "updatedAt", "direction": "desc" }
}
```

### Step C — Update CR milestone and SIT dates

```http
PATCH /api/v1/crs/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Request-Id: corr-003

{
  "status": "On Track",
  "milestone": "SIT",
  "planEndDate": "2026-05-20",
  "cr": {
    "sitStart": "2026-05-10",
    "sitEnd": "2026-05-18"
  }
}
```

### Step D — Mark CR as Fully Live (requires Actual End Date)

```http
PATCH /api/v1/crs/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Request-Id: corr-004

{
  "status": "Live",
  "milestone": "Fully Live",
  "endDate": "2026-05-13"
}
```

### Step E — List CRs in warranty period

```http
POST /api/v1/crs/list HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Request-Id: corr-005

{
  "filters": {
    "milestone": ["Live (Warranty Period)"],
    "status": ["LIVE"]
  },
  "page": 1,
  "pageSize": 50
}
```

---

## Data types and length notes

| Type in tables | Meaning |
|----------------|---------|
| TEXT | PostgreSQL `TEXT` — no fixed maximum in the database schema. |
| UUID | String identifier, typically 36 characters (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). |
| 10–30 | Date fields: commonly `YYYY-MM-DD` (10) or full ISO 8601 datetime (up to ~30). |
| — | No practical limit documented in API layer. |

---

## Error response shape (common)

```json
{
  "error": "Human-readable message",
  "details": {}
}
```

`details` is optional and may appear on some internal errors in development.

---

## Changelog / spec alignment

| Topic | Behavior |
|-------|----------|
| List method | `POST` (not `GET`) to support complex `filters` in body. |
| Partial update | `PATCH` with only changed fields. |
| `systemImpactedId` vs `systemImpactedIds` | Both accepted in list filters (same any-of logic). |
| User JWT | Interactive user tokens from normal login also work on `/api/v1/crs/*` (scope check bypassed for `type === 'user'`). Prefer client-credentials tokens for integrations. |
| **v1.1 — CR milestones** | `Live` split into `Live (Warranty Period)` + `Fully Live`. Legacy `Live` accepted on PATCH; list returns normalized labels. |
| **v1.1 — Fully Live rule** | `endDate` required when `status` = `Live` and `milestone` = `Fully Live` on PATCH (400 if missing). |
| **v1.1 — Milestone filter** | `filters.milestone` uses normalization (`Live` matches warranty-period CRs). |

For machine-readable schemas and response models, refer to [`docs/openapi-cr-list.yaml`](openapi-cr-list.yaml).
