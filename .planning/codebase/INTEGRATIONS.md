# External Integrations

**Analysis Date:** 2026-03-30

## Architecture: Deno Deploy Proxy

All external API calls are routed through a single Deno Deploy proxy at `https://vibediary.aiseossi-commits.deno.net`. The app never calls third-party APIs directly.

**Proxy implementation:** `cloudflare-worker/deno-main.ts`

**Endpoints:**
| Endpoint | Method | Purpose | Upstream |
|----------|--------|---------|----------|
| `/health` | GET | Warm ping (cold start prevention) | None |
| `/stt` | POST | Speech-to-text | Groq API |
| `/ai` | POST | Text generation (summarization, search) | Google Gemini API |
| `/embedding` | POST | Text embeddings | Google Gemini Embedding API |

**Proxy security:**
- `X-App-Secret` header required on every request (validated against `APP_SECRET` env var)
- Model allowlist: `gemini-2.5-flash-lite`, `gemini-2.0-flash`, `whisper-1`, `text-embedding-004`
- STT file size limit: 25MB
- AI request body limit: 100KB
- Rate limiting: 30 requests/minute per IP

## APIs & External Services

**Speech-to-Text (STT):**
- **Provider:** Groq API (whisper-large-v3-turbo model)
- **Client code:** `src/services/stt.ts` (`whisperSTT()` function)
- **Flow:** App sends `whisper-1` model name -> Proxy remaps to `whisper-large-v3-turbo` -> Groq `/openai/v1/audio/transcriptions`
- **Audio format:** m4a, mono, 44.1kHz
- **Features:** Korean language, verbose JSON response, hallucination filtering, no_speech_prob segment filtering
- **Timeout:** 30s client-side
- **Fallback chain:** iOS native STT (expo-speech-recognition) -> Groq Whisper -> error

**iOS Native STT:**
- **Provider:** Apple Speech Recognition (on-device)
- **Client code:** `src/services/stt.ts` (`deviceSTT()` function)
- **SDK:** `expo-speech-recognition` 3.1.1
- **Config:** Korean (`ko-KR`), file-based audio input, contextual strings (child name variants)
- **Timeout:** 15s (iOS only; Android skipped with 0ms timeout)
- **Confidence threshold:** 0.7 minimum

**AI Text Processing:**
- **Provider:** Google Gemini API (`generativelanguage.googleapis.com`)
- **Model:** `gemini-2.5-flash-lite` (primary, used for both summarization and search)
- **Client code:** `src/services/aiProcessor.ts` (`callGeminiAPI()`)
- **Purpose:** Voice record summarization, tag extraction, structured data extraction
- **Config:** temperature 0.3, maxOutputTokens 256 (summarization) / 800 (search), JSON response mode
- **Timeout:** 25s client-side
- **Prompt injection defense:** User input wrapped in `<user_input>` XML tags

**AI Search (Lighthouse):**
- **Provider:** Google Gemini API (same proxy endpoint)
- **Client code:** `src/services/searchPipeline.ts`
- **Purpose:** Full-context search over all records for a child
- **Flow:** Load all records from SQLite -> format as text -> send to Gemini with query
- **Supports:** Multi-turn conversation history

**Text Embeddings:**
- **Provider:** Google Gemini Embedding API (`gemini-embedding-001`)
- **Client code:** `src/services/aiProcessor.ts` (`generateEmbedding()`)
- **Status:** Endpoint exists but vector search has been fully replaced by full-context search (per project memory)
- **Timeout:** 8s client-side

## Data Storage

**Local Database:**
- SQLite via `expo-sqlite` ~55.0.11
- Database file: `vibediary.db`
- Client: `src/db/database.ts` (singleton pattern, lazy initialization)
- Schema version: 5 (managed via `PRAGMA user_version`)
- Timeout: 10s (3s on web)
- Tables: `children`, `records`, `tags`, `record_tags`, `offline_queue`, `daily_ai_cache`, `search_logs`
- Schema definition: `src/db/schema.ts`

**File Storage:**
- Local filesystem only via `expo-file-system`
- Audio recordings stored as m4a files
- Backup export as JSON files via `expo-sharing`

**Caching:**
- `daily_ai_cache` SQLite table - Caches daily AI analysis (rational + emotional summaries per date per child)
- Deno Deploy warm ping every 4 minutes to prevent cold starts (`src/services/aiProcessor.ts`: `warmDeno()`)

## Authentication & Identity

**API Authentication:**
- Shared secret (`X-App-Secret` header) between app and Deno Deploy proxy
- App-side: `EXPO_PUBLIC_WORKER_SECRET` env var
- Server-side: `APP_SECRET` env var on Deno Deploy
- No user authentication - single-device, single-user app

**Deno Deploy Server Secrets:**
- `APP_SECRET` - Shared secret for app authentication
- `GROQ_API_KEY` - Groq API key for Whisper STT
- `GOOGLE_AI_API_KEY` - Google AI API key for Gemini + Embeddings

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Bugsnag, or similar)

**Logs:**
- `console.error` / `console.warn` throughout service layer
- Production builds strip all console calls (`babel-plugin-transform-remove-console`)

## CI/CD & Deployment

**App Builds:**
- EAS Build (Expo Application Services)
- Profiles: development, development-simulator, preview, production
- Production auto-increments build number
- Version source: remote (`eas.json`: `appVersionSource: "remote"`)

**App Distribution:**
- iOS: TestFlight (via EAS Submit)
- Android: Google Play Internal Testing (via EAS Submit)

**Backend Deployment:**
- Deno Deploy (automatic from `cloudflare-worker/deno-main.ts`)
- URL: `https://vibediary.aiseossi-commits.deno.net`

**CI Pipeline:**
- Pre-commit hook: validates `STATE.md` inclusion + `npx tsc --noEmit` type check
- No CI/CD pipeline detected (no GitHub Actions, CircleCI, etc.)

## Environment Configuration

**Required client env vars (`.env`):**
| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_WORKER_URL` | Deno Deploy proxy base URL |
| `EXPO_PUBLIC_WORKER_SECRET` | Shared secret for proxy authentication |

**Required server env vars (Deno Deploy):**
| Variable | Purpose |
|----------|---------|
| `APP_SECRET` | Validates `X-App-Secret` header from app |
| `GROQ_API_KEY` | Groq API authentication for Whisper STT |
| `GOOGLE_AI_API_KEY` | Google AI API for Gemini + Embeddings |

## Offline Support

**Strategy:** Offline-first with queue-based retry

**Implementation:** `src/services/offlineQueue.ts`
- Network detection via `@react-native-community/netinfo` (`src/utils/network.ts`)
- Failed AI processing queued to `offline_queue` SQLite table
- Automatic retry with exponential backoff (10s, 30s, 1m, 2m)
- API error cooldown: 5 minutes on 429 errors
- Fallback result: raw text truncated to 100 chars as summary, `#일상` tag

**Offline capabilities:**
- Recording: Works fully offline
- STT: iOS native STT works offline; Whisper requires network
- AI processing: Queued for later; fallback summary used immediately
- Search: Requires network (AI-powered)
- Backup export/import: Works offline (local SQLite)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Data Flow Diagram

```
[User Voice] -> expo-av (m4a recording)
     |
     v
[STT Pipeline] -> iOS Native (expo-speech-recognition)
     |                    |
     | (fallback)         | (success, confidence >= 0.7)
     v                    v
[Deno Proxy /stt] -> Groq Whisper API
     |
     v
[AI Pipeline] -> [Deno Proxy /ai] -> Google Gemini API
     |                                    |
     | (offline)                          v
     v                            {summary, tags, structured_data}
[Offline Queue]                          |
     |                                   v
     | (network restored)          [SQLite DB]
     v
[Retry with backoff]
```

---

*Integration audit: 2026-03-30*
