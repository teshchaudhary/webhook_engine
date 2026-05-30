# Webhook Engine

A NestJS service for accepting tenant events, routing them to subscribed endpoints, and delivering signed webhooks asynchronously with PostgreSQL, Redis, and BullMQ.

This is still a small project, so the README sticks to the parts needed to run and test it locally.

## What It Does

- Register tenants with a one-time API key.
- Manage endpoints with exact event subscriptions or the `*` wildcard.
- Accept webhook events with an `Idempotency-Key`.
- Fan out each accepted event only to active, subscribed endpoints.
- Process deliveries in the background with retry/backoff behavior.
- Sign outbound webhook requests with HMAC headers.
- Query events and deliveries.
- Replay failed deliveries.
- Recover queue publication and stale-processing failures through a transactional outbox.

## Stack

- NestJS
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Axios

## Local Setup

### Prerequisites

- Node.js `24.14.1`
- Yarn `4.12.0`
- Docker and Docker Compose

### 1. Start Dependencies

```bash
docker compose up -d
```

This starts PostgreSQL, Redis, Adminer, and Redis Commander.

### 2. Install Packages

```bash
yarn install
```

Copy `.env.example` to `.env` and replace `ADMIN_API_KEY` before starting the service.

### 3. Prepare the Database

```bash
yarn db:migrate
yarn db:seed
```

The seed command prints a tenant API key used as the Bearer credential for event and delivery APIs.

### 4. Run the App

```bash
yarn start:dev
```

Default app URL:

```text
http://localhost:3000
```

`PROCESS_ROLE=all` runs the API and worker together for development. Production can run independent `PROCESS_ROLE=api` and `PROCESS_ROLE=worker` processes so they scale separately.

## Useful Commands

```bash
yarn build
yarn test
yarn lint:check
yarn db:generate
yarn db:migrate
yarn db:seed
```

## API Summary

Health and local receiver:

- `GET /`
- `GET /health`
- `POST /test-webhook`

Tenant management:

- `POST /api/v1/tenants`
- `GET /api/v1/tenants`
- `GET /api/v1/tenants/:id`
- `PATCH /api/v1/tenants/:id`
- `DELETE /api/v1/tenants/:id`
- `POST /api/v1/tenants/:id/rotate-api-key`

Tenant administration requires `x-admin-api-key: <ADMIN_API_KEY>`.

Endpoint management:

- `POST /api/v1/endpoints`
- `GET /api/v1/endpoints`
- `PATCH /api/v1/endpoints/:id`
- `DELETE /api/v1/endpoints/:id`
- `POST /api/v1/endpoints/:id/rotate-secret`

Events:

- `POST /api/v1/events`
- `GET /api/v1/events`
- `GET /api/v1/events/:id`

Deliveries:

- `GET /api/v1/deliveries`
- `GET /api/v1/deliveries/:id`
- `POST /api/v1/deliveries/:id/replay`

Endpoint, event, and delivery APIs require `Authorization: Bearer <tenant-api-key>`.

## Routing Example

```json
{
  "name": "Acme",
  "rateLimit": 100,
  "endpoints": [
    {
      "url": "https://accounting.example.com/webhooks",
      "eventTypes": ["order.created", "order.refunded"]
    },
    {
      "url": "https://analytics.example.com/webhooks",
      "eventTypes": ["*"]
    }
  ]
}
```

An `order.created` event creates deliveries for both endpoints. A `user.created` event creates a delivery only for the wildcard endpoint.

Outbound requests contain a stable envelope:

```json
{
  "id": "event-uuid",
  "type": "order.created",
  "version": "1",
  "createdAt": "2026-07-07T00:00:00.000Z",
  "data": {}
}
```

The complete envelope is signed using the endpoint secret and sent with `x-webhook-timestamp` and a versioned `x-webhook-signature` header.

Completed event history is retained indefinitely by default. Set `EVENT_RETENTION_DAYS` to a positive number to enable automatic cleanup; published outbox rows are removed after seven days.

## Project Layout

Most feature modules are organized around:

- `domain`: core entities and types.
- `application`: use cases and ports.
- `infrastructure`: Prisma, BullMQ, Redis, Axios, and other adapters.
- `presentation`: controllers and DTOs.

The goal is to keep business workflows in use cases and push framework/client-specific details to adapters.
