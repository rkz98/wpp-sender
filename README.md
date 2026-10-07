# wpp-sender

Batch WhatsApp messaging over HTTP. [Baileys](https://github.com/WhiskeySockets/Baileys) talks to WhatsApp
Web, [Fastify](https://fastify.dev) exposes the API.

## Requirements

- Node 24+ (runs `.ts` directly, no build step)
- A phone with WhatsApp to scan the QR code

## Run

```bash
npm install
cp .env.example .env         # then set API_KEY to any long secret
npm start                    # scan the QR code printed in the terminal
```

The session is saved in `auth/`. If WhatsApp logs the device out, the folder is cleared and a new QR code is printed.

## API

Every request needs the `x-api-key` header matching `API_KEY`. Missing or wrong key → `401`.

Postman: import `postman_collection.json`, then set the `apiKey` collection variable to the value in your `.env`.
"Create batch" saves the returned id into `jobId`, so "Get batch" works right after.

### `POST /batch`

Queues a batch and returns immediately. Jobs run one at a time, in order, with a random delay between each message.

```bash
curl -X POST localhost:3000/batch -H 'x-api-key: change-me' -H 'content-type: application/json' -d '{
  "contacts": [{ "name": "Ana", "number": "+55 11 99999-0001" }, { "number": "5511999990002" }],
  "message": "Hello {name}!",
  "delayMs": [15000, 30000]
}'
```

| Field      | Type                                  | Notes                                                                      |
|------------|---------------------------------------|----------------------------------------------------------------------------|
| `contacts` | `{ name?: string, number: string }[]` | 1 to 500. Any number formatting; non-digits are stripped                   |
| `message`  | `string`                              | Text to send. `{name}` is replaced by the contact's name (empty if absent) |
| `delayMs`  | `[number, number]`                    | Min/max delay between sends. Default `[15000, 30000]`                      |

Response `202`: `{ "id": "<uuid>", "total": 2 }`

### `GET /batch`

All jobs, in memory, as in `GET /batch/:id`.

### `GET /batch/:id`

`status` is `queued`, `running` or `done`.

```json
{
  "id": "…",
  "status": "running",
  "sent": [
    {
      "name": "Ana",
      "number": "+55 11 99999-0001"
    }
  ],
  "failed": [
    {
      "number": "5511999990002",
      "error": "not on WhatsApp"
    }
  ]
}
```

### `GET /status`

`{ "connected": true, "user": { … } }`

## Config

| Env        | Default     | Notes                                                 |
|------------|-------------|-------------------------------------------------------|
| `API_KEY`  | required    | Value clients must send in the `x-api-key` header     |
| `PORT`     | `3000`      |                                                       |
| `LOCALE`   | `en`        | Language for logs and errors. `en` or `pt-BR`         |
| `LOG_FILE` | `sends.log` | One JSON line per contact: `sent` or `failed` + error |

API error messages also honor the `Accept-Language` header per request.

Example `sends.log` lines:

```json
{
  "level": 30,
  "time": 1760000000000,
  "job": "…",
  "name": "Ana",
  "number": "+55 11 99999-0001",
  "msg": "sent"
}
{
  "level": 40,
  "time": 1760000003000,
  "job": "…",
  "number": "5511999990002",
  "error": "not on WhatsApp",
  "msg": "failed"
}
```

## Scripts

```bash
npm test             # self-check of the send loop with a fake socket
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
```

## Notes

- Jobs live in memory. A restart drops running batches.
- Keep delays generous. WhatsApp bans numbers that blast messages.
