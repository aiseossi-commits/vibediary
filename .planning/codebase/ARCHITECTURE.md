# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Service-oriented React Native with Context-based state management

**Key Characteristics:**
- Screens consume services directly (no ViewModel/Controller layer)
- Two React Context providers for global state (Theme, Child)
- Services encapsulate all business logic: STT, AI processing, offline queue, search
- DAO layer abstracts all SQLite operations
- All external API calls route through a Deno Deploy proxy (never direct)
- Offline-first with queue-based retry for AI processing

## Layers

**Presentation (Screens + Components):**
- Purpose: UI rendering, user interaction, navigation triggers
- Location: `src/screens/`, `src/components/`
- Contains: React components with inline styles via `createStyles(colors)` pattern
- Depends on: Context providers (`useTheme`, `useChild`), services, DAO layer
- Used by: Navigation (`AppNavigator`)

**State Management (Context):**
- Purpose: Global state shared across screens
- Location: `src/context/`
- Contains: `ChildContext.tsx` (active child, child list), `ThemeContext.tsx` (palette, dark/light mode)
- Depends on: DAO layer (`childrenDao`), file system (`app_settings.json`)
- Used by: All screens and the navigator

**Services:**
- Purpose: Business logic, external API orchestration, pipeline coordination
- Location: `src/services/`
- Contains: STT processing, AI processing, recording, search, offline queue, backup
- Depends on: DAO layer, `utils/network.ts`, Deno proxy (via `EXPO_PUBLIC_WORKER_URL`)
- Used by: Screens (directly) and `AppNavigator` (recording flow)

**Data Access (DAO):**
- Purpose: All SQLite read/write operations
- Location: `src/db/`
- Contains: Per-entity DAOs (`recordsDao`, `tagsDao`, `childrenDao`, `searchLogsDao`), shared queries (`queries.ts`), schema + migrations (`schema.ts`, `database.ts`)
- Depends on: `expo-sqlite`
- Used by: Services, screens (some screens query DAOs directly)

**Proxy (Deno Deploy Worker):**
- Purpose: Shield API keys, enforce rate limits, validate models
- Location: `cloudflare-worker/deno-main.ts`
- Contains: `/stt` (Whisper), `/ai` (Gemini), `/embedding`, `/health` endpoints
- Depends on: OpenAI Whisper API, Google Gemini API
- Used by: `src/services/stt.ts`, `src/services/aiProcessor.ts`, `src/services/searchPipeline.ts`

## Data Flow

**Recording Pipeline (voice input):**

```
User taps mic (HomeScreen)
  -> navigate to Recording screen
  -> RecordingScreenWrapper warms Deno proxy (warmDeno)
  -> audioRecorder.startRecording() (expo-av, m4a)
  -> User stops recording
  -> audioRecorder.stopRecording() -> file URI
  -> runSTTOnly(uri, childName)
       -> processSTT(uri)
            -> deviceSTT (iOS native, expo-speech-recognition)
            -> if low confidence -> whisperSTT (Deno proxy -> OpenAI Whisper)
            -> hallucination filter applied to both paths
  -> processFromText(uri, text, createdAt, childId)
       -> processWithAI(text, customTags) via Deno proxy -> Gemini
            -> returns { summary, tags, structuredData }
       -> If AI fails: createFallbackResult(text) + aiPending=true
       -> DB transaction:
            -> createRecord() (recordsDao)
            -> setTagsForRecord() (tagsDao)
            -> If aiPending: addToOfflineQueue()
  -> navigate back to Home/Calendar
```

**Text Input Pipeline (typed input):**

```
User types text (HomeScreen input bar)
  -> processTextRecord(text, childId, date)
       -> processWithAI(text) via Deno proxy
       -> DB transaction (same as recording)
  -> FlatList refresh
```

**Search Pipeline (AI lighthouse):**

```
User enters query (SearchScreen)
  -> searchRecords(query, childId, conversationHistory, childName)
       -> getAllRecordsForSearch(childId) -- loads up to 2000 records
       -> formatRecord() -- compact text: "YYYY-MM-DD #tags summary [structured]"
       -> generateAnswer(query, context, ...) via Deno proxy -> Gemini
  -> createSearchLog() saves Q&A to search_logs table
  -> Chat bubble UI displays conversation
```

**Offline Queue Recovery:**

```
Network restored OR app focus
  -> processOfflineQueue()
       -> For each pending item:
            -> processWithAI(rawText, customTags)
            -> updateRecord() with AI result
            -> setTagsForRecord()
       -> If 429 error: 5min cooldown
       -> If still pending: exponential backoff retry (10s, 30s, 1m, 2m)
       -> Notify listeners (onQueueProcessed callback)
```

**State Management:**

- **Child state:** `ChildContext` loads children from SQLite on mount, persists `activeChildId` to `app_settings.json` (file system). All data queries filter by `activeChild.id`.
- **Theme state:** `ThemeContext` loads theme mode + palette from same `app_settings.json`. Provides `colors` object consumed by all UI.
- **Screen-local state:** Each screen manages its own data via `useState` + `useFocusEffect` for refresh on navigation focus.
- **No global data cache:** Screens re-fetch from SQLite on each focus event. No Redux/Zustand/MobX.

## Key Abstractions

**RecordWithTags:**
- Purpose: Core data entity - a diary record joined with its tags
- Defined in: `src/types/record.ts`
- Used everywhere: screens, DAOs, services

**Pipeline Functions:**
- Purpose: Orchestrate multi-step async flows (STT -> AI -> DB)
- Location: `src/services/recordPipeline.ts`
- Three entry points: `runSTTOnly()`, `processFromText()`, `processTextRecord()`

**DAO Pattern:**
- Purpose: Each entity has a dedicated DAO file with CRUD operations
- Examples: `src/db/recordsDao.ts`, `src/db/tagsDao.ts`, `src/db/childrenDao.ts`
- Pattern: Each function calls `getDatabase()` (lazy init + singleton), executes SQL, maps rows to TypeScript types

## Entry Points

**App Entry:**
- Location: `App.tsx`
- Triggers: App launch
- Responsibilities: Font loading, provider tree setup (SafeAreaProvider -> ThemeProvider -> ChildProvider -> AppContent), DB initialization

**AppNavigator:**
- Location: `src/navigation/AppNavigator.tsx`
- Triggers: After DB + child data loaded (`isLoaded`)
- Responsibilities: Onboarding vs main flow branching, tab navigation, deep link handling (backup file import), RecordingScreenWrapper (pipeline orchestration)

**Deno Worker:**
- Location: `cloudflare-worker/deno-main.ts`
- Triggers: HTTP requests from app
- Responsibilities: Auth validation (`X-App-Secret`), rate limiting (30/min per IP), model allowlist, request proxying to Whisper/Gemini APIs

## Navigation Structure

```
Stack.Navigator (root)
  |
  +-- [No children] -> OnboardingScreen
  |
  +-- [Has children] ->
        |
        +-- "Main" -> Tab.Navigator
        |     +-- "Home"     -> HomeScreen
        |     +-- "Calendar" -> CalendarScreen
        |     +-- "Search"   -> SearchScreen (AI lighthouse chat)
        |     +-- "VoyageLog"-> VoyageLogScreen (search log history)
        |
        +-- "Recording"    -> RecordingScreenWrapper (fullScreenModal)
        +-- "RecordDetail" -> RecordDetailScreen (push)
        +-- "Tags"         -> TagsScreen (push)
        +-- "Settings"     -> SettingsScreen (push)
```

## Error Handling

**Strategy:** Graceful degradation with fallbacks at every layer

**Patterns:**
- STT: Device STT fails -> Whisper fallback. Both fail -> error thrown to caller
- AI processing: Gemini fails -> `createFallbackResult()` uses raw text as summary, sets `aiPending=true`, queues for retry
- Offline queue: Network down -> items stay in queue. 429 -> 5min cooldown. Other errors -> exponential backoff retry
- JSON parsing: Always wrapped in try-catch (enforced by CLAUDE.md rule)
- DB init: 10s timeout on native, 3s on web. Failure logged but app continues
- All `AbortController` timeouts: STT 30s, AI 25s, embedding 8s, health ping 5s

## Cross-Cutting Concerns

**Logging:** `console.warn` / `console.error` with `[Module]` prefix (e.g., `[STT]`, `[Pipeline]`, `[AI]`). No structured logging framework.

**Validation:**
- Worker-side: Model allowlist (`ALLOWED_MODELS`), file size limits (STT 25MB, AI body 100KB), `X-App-Secret` auth
- Client-side: Hallucination detection (blacklist patterns, language check, repetition check), audio file size check (10KB minimum)
- Prompt injection defense: User input wrapped in `<user_input>` XML tags

**Authentication:** Single shared secret (`X-App-Secret` header). No per-user auth. The app is local-first with no user accounts.

**Data Isolation:** All record/tag/search queries accept optional `childId` parameter. `ChildContext` ensures `activeChild.id` is always available. Tags are global (default 5) or per-child (custom).

**Offline Support:**
- DB: SQLite is always available (local)
- STT: Device STT works offline (iOS only). Whisper requires network.
- AI: Falls back to raw text. `aiPending` flag + `offline_queue` table for deferred processing.
- Search: Requires network (full-context AI query)

---

*Architecture analysis: 2026-03-30*
