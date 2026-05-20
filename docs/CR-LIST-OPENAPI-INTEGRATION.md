## CR List OpenAPI (Integration Guide)

This app is the **API Provider**. External apps integrating with it are **API Consumers**.

### OpenAPI file

- `docs/openapi-cr-list.yaml`

### Auth and Token Mechanism (API Consumer)

Use **Client Credentials** to obtain a JWT, then call the CR APIs with `Authorization: Bearer <token>`.

1) Admin creates an API client (Provider-side)

- Endpoint: `POST /api/admin/api-clients` (requires admin login token)
- Body example:

```json
{
  "name": "My Integration",
  "clientId": "my-integration-app",
  "clientSecret": "REPLACE_WITH_STRONG_SECRET",
  "scopes": "cr:read cr:write",
  "active": true
}
```

2) API Consumer requests a token

- Endpoint: `POST /api/auth/client-token`
- Headers:
  - `Content-Type: application/json`
  - `X-Request-Id: <optional-correlation-id>`
- Body:

```json
{
  "clientId": "my-integration-app",
  "clientSecret": "REPLACE_WITH_STRONG_SECRET"
}
```

Response:

```json
{
  "access_token": "JWT...",
  "token_type": "Bearer",
  "expires_in": 1800,
  "scope": "cr:read cr:write"
}
```

### CR List API (Provider: 5s latency budget)

The Provider enforces a **5 second timeout** on `/api/v1/crs/*` routes. If exceeded, API returns **504**.

#### List CRs

- Endpoint: `POST /api/v1/crs/list`
- Required headers:
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- Optional headers:
  - `X-Request-Id: <id>` (echoed back as `X-Request-Id`)

Body example:

```json
{
  "q": "",
  "filters": {
    "systemImpactedId": ["<dwsAppId1>", "<dwsAppId2>"],
    "status": ["LIVE", "DELAYED"],
    "priority": ["P0", "P1"],
    "active": true
  },
  "page": 1,
  "pageSize": 100,
  "sort": { "field": "updatedAt", "direction": "desc" }
}
```

#### Update CR (partial)

- Endpoint: `PATCH /api/v1/crs/{id}`
- Required headers:
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`

Body example:

```json
{
  "status": "On Track",
  "milestone": "SIT",
  "systemImpactedIds": ["<dwsAppId1>", "<dwsAppId2>"],
  "planEndDate": "2026-05-20",
  "cr": {
    "sitStart": "2026-05-10",
    "sitEnd": null
  }
}
```

