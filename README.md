<p align="center">
  <img src=".github/logo.png" width="480" alt="wpp-sender">
</p>

<p align="center">
  Self-hosted HTTP API for sending WhatsApp messages in batches.<br>
  No Meta Business account, no third-party gateway, no build step.
</p>

<p align="center">
  <a href="https://nodejs.org"><img alt="Node.js 24+" src="https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white"></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white"></a>
  <a href="https://fastify.dev"><img alt="Fastify" src="https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white"></a>
  <a href="https://github.com/WhiskeySockets/Baileys"><img alt="Baileys" src="https://img.shields.io/badge/Baileys-7-25D366?logo=whatsapp&logoColor=white"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue"></a>
</p>

---

**wpp-sender** wraps [Baileys](https://github.com/WhiskeySockets/Baileys) (a WhatsApp Web client) in a tiny
[Fastify](https://fastify.dev) server. You scan a QR code once, then `POST` a list of contacts and a message.
The server queues the batch, sends one message at a time with a random human-like delay, and lets you poll the result.

## Features

- **One endpoint to send** — `POST /batch` with contacts, a message and an optional delay range.
- **Per-contact templating** — `{name}`, `{city}`, any `{field}` of the contact is replaced in the message.
- **Number validation** — every number is checked with WhatsApp before sending; invalid ones land in `failed`.
- **Rate-limited by design** — messages go out sequentially with a random delay between them. Duplicates are dropped.
- **Job status** — poll `GET /batch/:id` or pass a `callbackUrl`. Cancel a running batch with `DELETE /batch/:id`.
- **Survives disconnects** — a batch pauses while WhatsApp is down and resumes when it reconnects.
- **Persistent session** — credentials are stored in `auth/`; restarts reconnect without a new QR code.
- **Audit log** — one JSON line per contact in `sends.log`, ready for `jq` or your log shipper.
- **i18n** — logs and error messages in `en` or `pt-BR`, overridable per request via `Accept-Language`.
- **Zero build** — runs TypeScript directly on Node 24. Four runtime dependencies. Docker image included.

## Quick start

> Requires **Node.js 24+** and a phone with WhatsApp.

```bash
git clone https://github.com/rkz98/wpp-sender.git
cd wpp-sender
npm install
cp .env.example .env   # set API_KEY to any long random string
npm start              # scan the QR code printed in the terminal
```

Once the terminal prints `WhatsApp connected`, send your first batch:

```bash
curl -X POST localhost:3000/batch \
  -H 'x-api-key: <your API_KEY>' \
  -H 'content-type: application/json' \
  -d '{
    "contacts": [
      { "name": "Ana", "number": "+55 11 99999-0001" },
      { "number": "5511999990002" }
    ],
    "message": "Hello {name}!"
  }'
# → 202 { "id": "6f1c…", "total": 2 }
```

Then check progress:

```bash
curl localhost:3000/batch/6f1c… -H 'x-api-key: <your API_KEY>'
```

### Docker

```bash
cp .env.example .env   # set API_KEY
docker compose up      # the QR code is printed in the container output
```

`auth/` and `logs/` are bind-mounted next to `compose.yaml`, so the session and the audit log survive rebuilds.

### Postman

Import [`postman_collection.json`](postman_collection.json) and set the `apiKey` collection variable. **Create batch**
stores the returned id in `jobId`, so **Get batch** works right away.

## API reference

All routes except `/health` require the `x-api-key` header. A missing or wrong key returns `401`.

| Method   | Path         | Description                                                    |
|----------|--------------|----------------------------------------------------------------|
| `POST`   | `/batch`     | Queue a batch. Returns `202` with the job id                   |
| `GET`    | `/batch`     | List every job held in memory                                  |
| `GET`    | `/batch/:id` | Get one job. `404` if unknown                                  |
| `DELETE` | `/batch/:id` | Cancel a queued or running job. Returns the job                |
| `GET`    | `/status`    | WhatsApp connection state                                      |
| `GET`    | `/health`    | `{ "connected": bool }`, no auth. For Docker and uptime checks |

### `POST /batch`

Request body:

| Field         | Type                                    | Required | Notes                                                                          |
|---------------|-----------------------------------------|----------|--------------------------------------------------------------------------------|
| `contacts`    | `{ number: string, [field]: string }[]` | yes      | 1–500 items. Any formatting is accepted; non-digits are stripped. Deduplicated |
| `message`     | `string`                                | yes      | `{field}` is replaced by the contact's field (empty string when absent)        |
| `delayMs`     | `[number, number]`                      | no       | Min/max delay between sends in ms, each ≥ `1000`. Default `[15000, 30000]`     |
| `callbackUrl` | `string`                                | no       | `POST`ed the final job JSON when the batch ends, is cancelled or fails         |

Responses:

- `202` — `{ "id": "<uuid>", "total": <contacts after dedupe> }`. The batch runs in the background.
- `400` — body failed validation.
- `503` — WhatsApp is not connected yet.

Batches run **one at a time, in submission order**. A second `POST` while one is running is queued behind it.

### `GET /batch/:id`

```json
{
  "id": "6f1c…",
  "status": "running",
  "message": "Hello {name}!",
  "delayMs": [
    15000,
    30000
  ],
  "contacts": [
    …
  ],
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

`status` is one of `queued`, `running`, `done`, `cancelled`. A `running` batch pauses while WhatsApp is disconnected
and resumes automatically; `DELETE /batch/:id` stops it after the current contact.

### `GET /status`

```json
{
  "connected": true,
  "user": {
    "id": "5511999990000:12@s.whatsapp.net",
    "name": "…"
  }
}
```

## Configuration

Set via `.env` (loaded with Node's built-in `--env-file`) or the environment.

| Variable   | Default     | Description                                                 |
|------------|-------------|-------------------------------------------------------------|
| `API_KEY`  | *required*  | Secret that clients must send in the `x-api-key` header     |
| `PORT`     | `3000`      | HTTP port                                                   |
| `LOCALE`   | `en`        | Language for console output and API errors. `en` or `pt-BR` |
| `LOG_FILE` | `sends.log` | Path of the per-contact audit log                           |

API error messages also honor the request's `Accept-Language` header, which takes precedence over `LOCALE`.

### Audit log

Every contact produces one JSON line in `LOG_FILE`:

```json
{
  "level": 30,
  "time": 1760000000000,
  "job": "6f1c…",
  "name": "Ana",
  "number": "+55 11 99999-0001",
  "msg": "sent"
}
{
  "level": 40,
  "time": 1760000003000,
  "job": "6f1c…",
  "number": "5511999990002",
  "error": "not on WhatsApp",
  "msg": "failed"
}
```

### Session

WhatsApp credentials live in `auth/` (git-ignored). If WhatsApp logs the device out, the folder is wiped and a
fresh QR code is printed. Delete `auth/` yourself to force a new login.

## Development

```bash
npm test            # self-check of the send loop against a fake socket
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

Project layout:

```
src/
├── server.ts      # Fastify app, routes, job queue
├── wa.ts          # Baileys connection, QR code, reconnect
├── schema.ts      # JSON schema for POST /batch
├── i18n.ts        # en / pt-BR messages
└── models/        # Contact, Job, Sender types
test.ts            # runnable assertions, no framework
```

## Limitations

- **Jobs live in memory.** Restarting the server drops queued and running batches. The audit log survives.
  Only the last 100 finished jobs are kept.
- **Single WhatsApp account.** One server process equals one phone.
- **Text only.** No media, buttons or groups yet.

## Disclaimer

This project uses an unofficial WhatsApp Web client. It is **not affiliated with or endorsed by WhatsApp or Meta**.
Sending unsolicited or high-volume messages violates WhatsApp's Terms of Service and **can get your number banned**.
Keep the delays generous, message only people who opted in, and use it at your own risk.

## Contributing

Issues and pull requests are welcome. Before opening a PR, run:

```bash
npm run lint && npm run typecheck && npm test
```

CI runs the same three commands on every PR. Every push to `main` that passes bumps the patch version and tags it.

## License

[MIT](LICENSE) © Kauê
