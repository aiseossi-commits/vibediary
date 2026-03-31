# Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
vibediary/
├── App.tsx                  # App root: providers + DB init
├── index.ts                 # Expo entry point (registerRootComponent)
├── src/
│   ├── components/          # Shared UI components
│   ├── constants/           # Theme tokens (colors, spacing, fonts)
│   ├── context/             # React Context providers (Child, Theme)
│   ├── db/                  # SQLite schema, DAOs, queries
│   ├── hooks/               # Custom React hooks
│   ├── mocks/               # Jest mocks for native modules
│   ├── navigation/          # Stack + Tab navigator
│   ├── screens/             # Full-page screen components
│   ├── services/            # Business logic (STT, AI, pipelines)
│   ├── types/               # TypeScript interfaces
│   └── utils/               # Small utility functions
├── cloudflare-worker/       # Deno Deploy proxy (STT, AI, embedding)
├── scripts/                 # Build/asset generation scripts
├── patches/                 # patch-package patches
├── assets/                  # Fonts, icons, splash images
├── docs/                    # Product docs, privacy policy
├── openspec/                # OpenSpec change management artifacts
├── memory/                  # Claude memory files
├── .planning/               # GSD planning artifacts
├── app.json                 # Expo config
├── eas.json                 # EAS Build profiles
├── babel.config.js          # Babel config (module-resolver)
├── metro.config.js          # Metro bundler config
├── tsconfig.json            # TypeScript config
├── STATE.md                 # Required in every commit (pre-commit hook)
├── CLAUDE.md                # Claude agent instructions
└── CHANGELOG.md             # Release history
```

## Directory Purposes

**`src/screens/`**
- Purpose: Full-page screen components, one file per screen
- Contains: 9 screen files, each self-contained with styles
- Key files:
  - `HomeScreen.tsx` (14KB): Main screen with recording button, recent records, text input
  - `CalendarScreen.tsx` (26KB): Monthly calendar view + AI daily analysis
  - `SearchScreen.tsx` (13KB): AI-powered chat search ("AI lighthouse")
  - `RecordingScreen.tsx` (10KB): Audio recording UI with animated blob
  - `RecordDetailScreen.tsx` (19KB): Record detail view/edit
  - `SettingsScreen.tsx` (27KB): Child profile CRUD, theme selection, backup/restore
  - `TagsScreen.tsx` (14KB): Tag-filtered record browsing
  - `VoyageLogScreen.tsx` (6KB): Search history log viewer
  - `OnboardingScreen.tsx` (4KB): First-run child profile creation

**`src/services/`**
- Purpose: Core business logic -- all external API calls and processing pipelines
- Contains: 7 service files
- Key files:
  - `recordPipeline.ts`: Orchestrates STT + AI + DB save in one flow. Three entry points: `runSTTOnly()`, `processFromText()`, `processTextRecord()`
  - `stt.ts`: Speech-to-text with iOS native first, Whisper (via Groq) fallback. Includes silence detection, hallucination filtering, name-variant hints
  - `aiProcessor.ts`: Gemini API calls via Worker proxy. Summarizes voice records, generates embeddings, creates fallback results for offline
  - `searchPipeline.ts`: Full-context AI search -- loads all records, sends to Gemini with conversation history
  - `offlineQueue.ts`: Queues failed AI processing for retry when network returns. Exponential backoff, 429 cooldown
  - `backupService.ts`: JSON export/import with merge and overwrite restore modes
  - `audioRecorder.ts`: expo-av recording wrapper with metering callback

**`src/db/`**
- Purpose: SQLite database layer -- schema, migrations, and data access objects
- Contains: 8 files (schema + DAOs + barrel export)
- Key files:
  - `database.ts`: DB singleton with lazy init, versioned migrations (v0-v5), 10s timeout
  - `schema.ts`: All CREATE TABLE statements, indexes, migration SQL, DEFAULT_TAGS constant
  - `recordsDao.ts`: CRUD for `records` table. Handles embedding BLOB conversion, child-filtered queries
  - `tagsDao.ts`: Tag CRUD with global/per-child separation. Default tags are always global (child_id=NULL)
  - `queries.ts`: Complex queries -- date range, daily summaries (calendar), tag filtering, text search, full-context search
  - `childrenDao.ts`: Simple CRUD for `children` table. Exports `Child` type
  - `searchLogsDao.ts`: CRUD for AI search conversation logs
  - `index.ts`: Barrel file re-exporting all DAOs and database functions

**`src/context/`**
- Purpose: React Context providers for global state
- Contains: 2 providers
- Key files:
  - `ChildContext.tsx`: Manages active child selection. Persists `activeChildId` to filesystem JSON. Exports `useChild()` hook
  - `ThemeContext.tsx`: Dark/light mode + palette selection (8 palettes). Persists to same settings file. Exports `useTheme()` hook

**`src/components/`**
- Purpose: Reusable UI components shared across screens
- Contains: 3 components
- Key files:
  - `RecordCard.tsx`: Card displaying a single diary record with tags, used in HomeScreen and TagsScreen
  - `TagChip.tsx`: Pill-shaped tag badge component with selected/unselected states
  - `WaveLoader.tsx`: Animated loading indicator (6 bars)

**`src/constants/`**
- Purpose: Design tokens and theme configuration
- Contains: 1 file
- Key files:
  - `theme.ts` (17KB): SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS constants. 8 color palettes (sage, ocean, lavender, sunset, forest, rose, midnight, sand) each with dark/light/density variants. Exports `AppColors` type and `PALETTES` map

**`src/hooks/`**
- Purpose: Custom React hooks
- Contains: 1 hook
- Key files:
  - `useRecording.ts`: Wraps `audioRecorder` service with React state (isRecording, isPaused, duration, audioLevel). Used by RecordingScreen

**`src/types/`**
- Purpose: Shared TypeScript interfaces
- Contains: 1 file
- Key files:
  - `record.ts`: Core domain types -- `DiaryRecord`, `RecordWithTags`, `StructuredData`, `Tag`, `AIProcessingResult`, `STTResult`, `SearchResult`, `ChatMessage`, `SearchLog`, `DailyRecordSummary`

**`src/utils/`**
- Purpose: Small pure utility functions
- Contains: 1 file
- Key files:
  - `network.ts`: `getNetworkState()` using @react-native-community/netinfo with fetch fallback

**`src/navigation/`**
- Purpose: App routing and screen orchestration
- Contains: 1 file
- Key files:
  - `AppNavigator.tsx`: Defines Stack navigator (Onboarding vs Main flow) and Tab navigator (Home, Calendar, Search, VoyageLog). Contains `RecordingScreenWrapper` that orchestrates recording -> STT -> AI -> navigate back. Handles backup file deep links

**`src/mocks/`**
- Purpose: Jest mock implementations for native modules
- Contains: 2 files
- Key files:
  - `expo-av.js`: Mock for audio recording module
  - `expo-speech-recognition.js`: Mock for iOS speech recognition

**`cloudflare-worker/`**
- Purpose: Deno Deploy proxy server that shields API keys from the client
- Contains: 3 files
- Key files:
  - `deno-main.ts`: Main proxy with 4 endpoints: `/health`, `/stt` (Groq Whisper), `/ai` (Gemini), `/embedding` (Gemini). Has rate limiting (30/min per IP), model allowlist, size limits (25MB STT, 100KB AI)
  - `index.js`: Legacy Cloudflare Worker (unused, kept for reference)
  - `wrangler.toml`: Cloudflare config

**`scripts/`**
- Purpose: Development and build utility scripts
- Contains: 3 files
- Key files:
  - `bump-android-version.js`: Auto-increments Android versionCode in app.json
  - `generate-icons.js`: Generates app icons from source image
  - `generate-splash.js`: Generates splash screen assets

## Key File Locations

**Entry Points:**
- `index.ts`: Expo registerRootComponent
- `App.tsx`: Provider tree (SafeAreaProvider > ThemeProvider > ChildProvider > AppContent)
- `src/navigation/AppNavigator.tsx`: All routing decisions

**Configuration:**
- `app.json`: Expo app config (bundle IDs, permissions, version codes)
- `eas.json`: EAS Build profiles (development, preview, production)
- `tsconfig.json`: TypeScript strict mode config
- `babel.config.js`: Module resolver aliases
- `.prettierrc`: Code formatting rules

**Core Logic:**
- `src/services/recordPipeline.ts`: Central pipeline (STT -> AI -> DB)
- `src/services/stt.ts`: Speech recognition (iOS native + Whisper fallback)
- `src/services/aiProcessor.ts`: AI processing (Gemini via Deno proxy)
- `src/services/searchPipeline.ts`: AI search (full-context Gemini)
- `src/db/database.ts`: Database initialization and migrations

**State Management:**
- `src/context/ChildContext.tsx`: Active child (global state)
- `src/context/ThemeContext.tsx`: Theme mode + palette (global state)

## Naming Conventions

**Files:**
- Screens: `PascalCase` + `Screen` suffix (e.g., `HomeScreen.tsx`)
- Services: `camelCase` (e.g., `recordPipeline.ts`, `aiProcessor.ts`)
- DAOs: `camelCase` + `Dao` suffix (e.g., `recordsDao.ts`, `tagsDao.ts`)
- Components: `PascalCase` (e.g., `RecordCard.tsx`, `TagChip.tsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `useRecording.ts`)
- Contexts: `PascalCase` + `Context` suffix (e.g., `ChildContext.tsx`)

**Directories:**
- All lowercase, plural where appropriate (e.g., `screens/`, `services/`, `hooks/`)

## Import/Dependency Patterns

**Layer dependencies (top to bottom):**
```
screens/  -->  services/  -->  db/       -->  (expo-sqlite)
   |              |              |
   v              v              v
context/       utils/         types/
   |
   v
constants/theme.ts
components/
```

**Key dependency flows:**

1. **Recording flow:**
   `AppNavigator.tsx` (RecordingScreenWrapper) -> `recordPipeline.ts` -> `stt.ts` + `aiProcessor.ts` -> `recordsDao.ts` + `tagsDao.ts`

2. **Search flow:**
   `SearchScreen.tsx` -> `searchPipeline.ts` -> `queries.ts` (getAllRecordsForSearch) + `aiProcessor.ts` (via fetch to Deno worker)

3. **Data display flow:**
   `HomeScreen.tsx` / `CalendarScreen.tsx` -> `queries.ts` / `recordsDao.ts` -> `database.ts`

4. **Theme/Child state flow:**
   All screens -> `useTheme()` from `ThemeContext.tsx` + `useChild()` from `ChildContext.tsx`

**All external API calls route through:**
   `src/services/*.ts` -> `fetch()` -> Deno proxy (`cloudflare-worker/deno-main.ts`) -> Groq/Google APIs

**No screen imports another screen.** Screens are leaf nodes connected only through the navigator.

**No service imports a screen or component.** Services are pure business logic.

**DAOs never import services.** Data access is a lower layer.

## Where to Add New Code

**New Screen:**
- Create: `src/screens/NewFeatureScreen.tsx`
- Register in: `src/navigation/AppNavigator.tsx` (add to Stack.Navigator or Tab.Navigator)
- Use `useTheme()` for colors, `useChild()` for active child filtering
- Use `createStyles(colors)` pattern for StyleSheet (defined outside component)

**New Shared Component:**
- Create: `src/components/ComponentName.tsx`
- Import theme tokens from `src/constants/theme.ts`
- Use `useTheme()` for runtime colors

**New Service / Business Logic:**
- Create: `src/services/featureName.ts`
- If it calls external APIs, route through the Deno proxy (`EXPO_PUBLIC_WORKER_URL`)
- If it needs offline support, integrate with `src/services/offlineQueue.ts`

**New Database Table or Query:**
- Schema: Add CREATE TABLE to `src/db/schema.ts`
- Migration: Add versioned migration in `src/db/database.ts` (increment user_version)
- DAO: Create `src/db/featureDao.ts` with CRUD functions
- Export: Add to `src/db/index.ts` barrel file

**New Type/Interface:**
- Add to `src/types/record.ts` (single type file for the whole app)

**New Custom Hook:**
- Create: `src/hooks/useFeatureName.ts`

**New Utility Function:**
- Add to `src/utils/` (create new file if unrelated to existing utils)

**New Deno Proxy Endpoint:**
- Add handler in `cloudflare-worker/deno-main.ts`
- Add model to `ALLOWED_MODELS` if needed

## Special Directories

**`openspec/`**
- Purpose: Change management artifacts (design specs, verification results)
- Generated: Partially (by Claude during `/openspec-*` workflow)
- Committed: Yes
- Subdirs: `changes/` (active + archived changes), `specs/` (spec templates)

**`dist/`**
- Purpose: Expo web build output
- Generated: Yes (by `expo export`)
- Committed: Yes (checked in for reference)

**`apk/` and `bundle/`**
- Purpose: Local Android build artifacts
- Generated: Yes
- Committed: No (in `.easignore`)

**`patches/`**
- Purpose: patch-package patches for node_modules fixes
- Contains: `expo-sharing+55.0.11.patch`
- Committed: Yes (applied via `postinstall`)

**`memory/`**
- Purpose: Claude agent memory files (persistent context across sessions)
- Committed: Yes

**`.planning/`**
- Purpose: GSD planning and codebase analysis documents
- Generated: By Claude during `/gsd:*` workflows
- Committed: Yes

---

*Structure analysis: 2026-03-30*
