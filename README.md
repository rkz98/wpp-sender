# wpp-inviter

Batch WhatsApp messaging over HTTP. [Baileys](https://github.com/WhiskeySockets/Baileys) talks to WhatsApp Web, [Fastify](https://fastify.dev) exposes the API.

## Requirements

- Node 24+ (runs `.ts` directly, no build step)
- A phone with WhatsApp to scan the QR code

## Run

```bash
npm install
npm start          # scan the QR code printed in the terminal
```

The session is saved in `auth/`. Delete the folder to log in with another number.

## API

### `POST /batch`

Queues a batch and returns immediately. Messages go out in the background with a random delay between each one.

```bash
curl -X POST localhost:3000/batch -H 'content-type: application/json' -d '{
  "numbers": ["+55 11 99999-0001", "5511999990002"],
  "message": "Hello!",
  "delayMs": [3000, 8000]
}'
```

| Field     | Type                 | Notes                                            |
|-----------|----------------------|--------------------------------------------------|
| `numbers` | `string[]`           | 1 to 500. Any formatting; non-digits are stripped |
| `message` | `string`             | Text to send                                     |
| `delayMs` | `[number, number]`   | Min/max delay between sends. Default `[3000, 8000]` |

Response `202`: `{ "id": "<uuid>", "total": 2 }`

### `GET /batch/:id`

```json
{
  "id": "…",
  "status": "running",
  "sent": ["+55 11 99999-0001"],
  "failed": [{ "number": "5511999990002", "error": "not on WhatsApp" }]
}
```

### `GET /status`

`{ "connected": true, "user": { … } }`

## Config

| Env      | Default | Notes                                        |
|----------|---------|----------------------------------------------|
| `PORT`   | `3000`  |                                              |
| `LOCALE` | `en`    | Language for logs and errors. `en` or `pt-BR` |

API error messages also honor the `Accept-Language` header per request.

## Scripts

```bash
npm test             # self-check of the send loop with a fake socket
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
```

## Notes

- Jobs live in memory. A restart drops running batches.
- Keep delays generous. WhatsApp bans numbers that blast messages.
