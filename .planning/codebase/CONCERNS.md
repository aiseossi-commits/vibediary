# Codebase Concerns

**Analysis Date:** 2026-03-30

## Dead Code

**Embedding system (CRITICAL):**
- Issue: The vector embedding system was removed from the search pipeline (replaced by full-context AI search per `project_search_architecture.md`), but significant dead code remains across multiple files.
- Files:
  - `src/services/aiProcessor.ts:141-148` — `buildEmbeddingText()` exported but never imported anywhere
  - `src/services/aiProcessor.ts:151-180` — `generateEmbedding()` exported but never imported anywhere
  - `src/db/recordsDao.ts:6-14` — `float32ToBlob()` and `blobToFloat32()` helper functions only used for embedding BLOB conversion; all callers now pass `embedding: null`
  - `src/db/recordsDao.ts:22` — `embedding` parameter in `createRecord()` always receives `null` (see `src/services/recordPipeline.ts:54,92`, `src/services/offlineQueue.ts:111`)
  - `src/db/recordsDao.ts:123-126` — `embedding` branch in `updateRecord()` always receives `null`
  - `src/db/schema.ts:20` — `embedding BLOB` column in records table is never populated
  - `src/types/record.ts:10` — `embedding: number[] | null` field on `DiaryRecord` always `null`
  - `src/db/queries.ts:215` — Comment says "embedding not loaded for performance" but embedding is never used at all
- Impact: ~70 lines of dead code across 4 files. `float32ToBlob`/`blobToFloat32` are non-trivial utility functions that will never execute. The `embedding` BLOB column wastes schema space.
- Fix approach: Remove `buildEmbeddingText`, `generateEmbedding`, `float32ToBlob`, `blobToFloat32`. Remove `embedding` parameter from `createRecord`/`updateRecord`. Drop the `embedding` column via migration v6.

**`textSearchRecords` function (MEDIUM):**
- Issue: Exported function never imported anywhere outside its own file
- Files: `src/db/queries.ts:142-175`
- Impact: ~33 lines of dead code. Was likely used before full-context search transition.
- Fix approach: Remove the function.

**`mood` column in schema (LOW):**
- Issue: `mood TEXT` column defined in records table schema but never read or written by any code
- Files: `src/db/schema.ts:19`
- Impact: Unused column in every row. May confuse future developers.
- Fix approach: Drop column via migration, or document as reserved for future use.

**`isRecording()` function in audioRecorder (LOW):**
- Issue: Exported function never imported by any consumer
- Files: `src/services/audioRecorder.ts:117-119`
- Impact: 3 lines. Minor dead code.
- Fix approach: Remove the export.

**`pauseRecording`/`resumeRecording` never used from screens (LOW):**
- Issue: These functions are imported by `useRecording.ts` which exposes `pause`/`resume`, but no screen ever calls `pause` or `resume` on the hook. The recording UI only has start/stop.
- Files:
  - `src/services/audioRecorder.ts:105-114`
  - `src/hooks/useRecording.ts:97-126` — `pause` and `resume_` callbacks
- Impact: ~30 lines of unused pause/resume logic. Not harmful but adds complexity.
- Fix approach: Remove if pause/resume is not planned. Keep if the feature is upcoming.

**`closeDatabase()` never called (LOW):**
- Issue: Exported but never invoked by any code. The database is never explicitly closed.
- Files: `src/db/database.ts:134-141`, exported via `src/db/index.ts:1`
- Impact: Minor. React Native apps typically don't close DB on exit.
- Fix approach: Keep as a utility for potential future use (e.g., hot reload, testing).

**`searchLogsDao` not re-exported from db/index.ts (LOW):**
- Issue: `src/db/searchLogsDao.ts` is not exported from `src/db/index.ts`, while all other DAOs are. Direct imports from `../db/searchLogsDao` work but break the barrel pattern.
- Files: `src/db/index.ts:1-5` (missing `searchLogsDao`), `src/screens/SearchScreen.tsx:20`, `src/screens/VoyageLogScreen.tsx:13`
- Impact: Inconsistency. All other DB modules are accessed via `../db` barrel.
- Fix approach: Add `export * from './searchLogsDao';` to `src/db/index.ts`.

**`handleRecordPress` in SearchScreen unused (LOW):**
- Issue: `handleRecordPress` is defined at `src/screens/SearchScreen.tsx:270-272` and included in `renderMessage` dependency array at line 301, but is never actually called within the render function. It appears to be a leftover from when search results included record links.
- Files: `src/screens/SearchScreen.tsx:270-272,301`
- Impact: Unnecessary function and dependency array entry. Minor.
- Fix approach: Remove the callback and its dependency.

## Unused Dependencies

**`@expo/metro-runtime` (MEDIUM):**
- Issue: Listed in `package.json` dependencies but never imported in any source file
- Files: `package.json` (line: `"@expo/metro-runtime": "55.0.6"`)
- Impact: Adds to bundle size. However, Expo may auto-import this at build time for web support.
- Fix approach: Verify if Expo SDK 55 requires this implicitly. If not, remove.

**`expo-font` (LOW):**
- Issue: Not imported in any `src/` file. Used only in `App.tsx` via `useFonts` from `expo-font`.
- Files: `App.tsx:5` uses `useFonts` from `expo-font`
- Impact: Actually used at root level. This is NOT dead — it's correctly used outside `src/`.
- Fix approach: None needed.

**`expo-status-bar` (LOW):**
- Issue: Not imported in any `src/` file. Used only in `App.tsx:3`.
- Files: `App.tsx:3`
- Impact: Actually used at root level. NOT dead.
- Fix approach: None needed.

**`react-dom` and `react-native-web` (LOW):**
- Issue: Listed as dependencies but the app targets iOS/Android only. No web-specific code exists.
- Files: `package.json`
- Impact: Unnecessary dependencies for a mobile-only app. May have been auto-added by Expo template.
- Fix approach: Remove if web target is not planned. Keep if `expo start --web` is used for development.

**`react-native-worklets` (MEDIUM):**
- Issue: Listed as dependency but never imported in any source file
- Files: `package.json` (`"react-native-worklets": "^0.7.4"`)
- Impact: Unnecessary native dependency. May be a peer dependency of `react-native-reanimated` v4.
- Fix approach: Check if `react-native-reanimated` 4.x requires it as a peer dep. If so, move to comment or keep. If not, remove.

## Security Considerations

**JSON.parse without try-catch in context files (MEDIUM):**
- Issue: Several `JSON.parse` calls in context providers lack explicit error handling around the parsed data shape. While wrapped in promise `.catch()`, the parse itself could succeed with unexpected structure.
- Files:
  - `src/context/ThemeContext.tsx:38` — `JSON.parse(json)` in `.then()` — caught by outer `.catch(() => {})`
  - `src/context/ThemeContext.tsx:52` — `JSON.parse(json)` in `.then()` — caught by outer `.catch()`
  - `src/context/ChildContext.tsx:50` — `JSON.parse(json)` in async IIFE — caught by outer `catch {}`
  - `src/context/ChildContext.tsx:64` — `JSON.parse(json)` in `.then()` — caught by `.catch()`
- Impact: If `app_settings.json` is corrupted, the app silently recovers (good). However, type-checking the parsed result would be more robust.
- Fix approach: These are adequately protected by surrounding catch blocks. LOW risk. Consider adding runtime shape validation for extra safety.

**All JSON.parse calls properly guarded (GOOD):**
- `src/services/aiProcessor.ts:117` — inside `try-catch` block
- `src/services/backupService.ts:67,97` — inside `try-catch` blocks
- `src/db/recordsDao.ts:195` — inside inline `try-catch`
- `src/db/queries.ts:212` — inside inline `try-catch`
- No violations of the `JSON.parse` always in try-catch rule.

## Performance Concerns

**Large screen files (MEDIUM):**
- Issue: Several screen files exceed 300 lines, making them harder to maintain and test
- Files:
  - `src/screens/SettingsScreen.tsx` — 606 lines
  - `src/screens/CalendarScreen.tsx` — 572 lines
  - `src/screens/RecordDetailScreen.tsx` — 412 lines
  - `src/constants/theme.ts` — 378 lines (data file, acceptable)
  - `src/screens/SearchScreen.tsx` — 376 lines
  - `src/screens/HomeScreen.tsx` — 334 lines
  - `src/screens/TagsScreen.tsx` — 327 lines
  - `src/services/stt.ts` — 334 lines
- Impact: SettingsScreen and CalendarScreen are especially large. SettingsScreen mixes child management, backup/restore, theme selection, offline queue, donation, and app info in one component. CalendarScreen combines calendar, bottom sheet, date picker, text input, and record display.
- Fix approach: Extract sub-sections of SettingsScreen into separate components (e.g., `ChildManagement`, `BackupRestore`, `ThemeSettings`). Extract CalendarScreen's bottom sheet into a reusable component.

**N+1 query pattern in record loading (MEDIUM):**
- Issue: All record list queries fetch records first, then issue a separate query per record to get tags. For N records, this is N+1 queries.
- Files:
  - `src/db/queries.ts:25-33` — `getRecordsByDateRange`: loops over rows, queries tags individually
  - `src/db/queries.ts:129-138` — `getRecordsByTags`: same pattern
  - `src/db/queries.ts:190-200` — `getAllRecordsForSearch`: same pattern (up to 2000 records = 2001 queries)
  - `src/db/recordsDao.ts:77-83` — `getAllRecords`: same pattern
- Impact: For the search pipeline (`getAllRecordsForSearch` with limit=2000), this means up to 2001 SQL queries per search. SQLite is fast locally but this is unnecessarily wasteful.
- Fix approach: Use a single JOIN query with `GROUP_CONCAT` to fetch tags alongside records, or batch tag queries with `WHERE record_id IN (...)`.

**Duplicated `mapRow` functions (MEDIUM):**
- Issue: Two nearly identical row-to-model mapping functions exist
- Files:
  - `src/db/queries.ts:204-220` — `mapRow(row, tags)`
  - `src/db/recordsDao.ts:187-203` — `mapRowToRecordWithTags(row, tags)`
- Impact: Logic duplication. If the mapping logic changes, both must be updated. The queries.ts version hardcodes `embedding: null` while recordsDao.ts reads from the BLOB.
- Fix approach: Extract a shared mapper or have queries.ts import from recordsDao.ts.

**Duplicated tag color logic (LOW):**
- Issue: Tag-to-color mapping logic is duplicated across files
- Files:
  - `src/components/TagChip.tsx:27-36` — `getTagColor()` returns `colors.textSecondary` for unknown tags
  - `src/screens/TagsScreen.tsx:74-89` — `getTagColor()` with `hashTagColor()` returns a hashed color for unknown tags
- Impact: Inconsistent behavior for custom tags: TagChip shows them as gray, TagsScreen shows them with computed colors. Visual inconsistency.
- Fix approach: Extract a shared `getTagColor` utility. Decide on one approach for custom tag colors.

## Technical Debt

**Embedding infrastructure still wired into the data model (CRITICAL):**
- Issue: Despite removing vector search, the `embedding` field persists throughout the type system, DAO layer, and schema. Every `createRecord` and `updateRecord` call passes `embedding: null`. The `DiaryRecord` type still includes `embedding: number[] | null`.
- Files: See "Embedding system" in Dead Code section above
- Impact: Increases cognitive load. New developers will wonder what the embedding field is for. The `float32ToBlob`/`blobToFloat32` converters suggest active use.
- Fix approach: Complete the embedding removal: drop DB column, remove from types, remove helper functions, remove from DAO parameters.

**Shared settings file race condition (MEDIUM):**
- Issue: Both `ThemeContext` and `ChildContext` read/write the same `app_settings.json` file using a read-modify-write pattern without locking. If both contexts save settings simultaneously, one write can overwrite the other.
- Files:
  - `src/context/ThemeContext.tsx:49-56` — `saveSettings()` reads then writes
  - `src/context/ChildContext.tsx:60-68` — `setActiveChild()` reads then writes
- Impact: In practice, users rarely change theme and child simultaneously, but it's a latent bug. A fast tap on theme toggle + child switch could lose one setting.
- Fix approach: Use a single settings context/service with queued writes, or use separate files for separate concerns.

**`any` type usage in navigation props (LOW):**
- Issue: Multiple screens use `any` for navigation and route props instead of proper React Navigation typing
- Files:
  - `src/screens/HomeScreen.tsx:34` — `navigation: any`
  - `src/screens/RecordDetailScreen.tsx:36-37` — `route: any; navigation: any`
  - `src/screens/TagsScreen.tsx:31` — `navigation: any`
  - `src/navigation/AppNavigator.tsx:209` — `{ navigation, route }: any`
  - `src/screens/CalendarScreen.tsx:125` — `useNavigation<any>()`
  - `src/screens/SearchScreen.tsx:208` — `useNavigation<any>()`
- Impact: Loses TypeScript protection for navigation params. Mistyped route names or missing params won't be caught at compile time.
- Fix approach: Define a `RootStackParamList` type and use typed navigation props throughout.

**Inline styles in AppNavigator loading screen (LOW):**
- Issue: Inline styles used instead of `createStyles` pattern
- Files: `src/navigation/AppNavigator.tsx:148-154` — loading state uses inline style objects
- Impact: Inconsistency with rest of codebase which uses `createStyles(colors)` pattern.
- Fix approach: Extract to a `createStyles` function.

## Code Smells

**Duplicated backup restore logic (MEDIUM):**
- Issue: Backup restore flow (Alert dialog for merge/overwrite choice) is implemented twice: once in `SettingsScreen` and once in `AppNavigator` for incoming file handling.
- Files:
  - `src/screens/SettingsScreen.tsx:121-184` — `handleImport`
  - `src/navigation/AppNavigator.tsx:78-121` — `handleIncomingFile`
- Impact: If restore logic changes (e.g., adding a new restore mode), both must be updated.
- Fix approach: Extract a shared `promptAndRestore(data, refreshChildren)` utility.

**Duplicated `processOfflineQueue` + reload pattern (LOW):**
- Issue: The pattern `processOfflineQueue().then(() => loadRecords()).catch(() => {})` is repeated multiple times
- Files:
  - `src/screens/HomeScreen.tsx:180-181` — in `useFocusEffect`
  - `src/screens/HomeScreen.tsx:190` — in `handleRefresh`
  - `src/screens/HomeScreen.tsx:203` — in `handleTextSubmit`
  - `src/screens/CalendarScreen.tsx:227-229` — in `useFocusEffect`
  - `src/screens/CalendarScreen.tsx:326-328` — in `handleSaveText`
- Impact: Minor duplication but makes the pattern hard to change globally.
- Fix approach: Create a `processQueueAndReload(reloadFn)` helper.

## Scaling Limits

**Full-context search sends all records to AI (MEDIUM):**
- Issue: `getAllRecordsForSearch` loads up to 2000 records and sends all their text to the Gemini API in a single request. As users accumulate records, the context window and token cost grow linearly.
- Files:
  - `src/db/queries.ts:178` — `limit = 2000`
  - `src/services/searchPipeline.ts:55` — `records.map(formatRecord).join('\n')` concatenates all records
- Impact: At 2000 records with ~50 chars each, context is ~100K chars. Gemini 2.5 Flash Lite has a context window limit. Token costs scale with record count.
- Fix approach: Implement a pre-filtering step (date range, keyword match) to reduce the context sent to AI. Consider summarizing older records.

## Test Coverage Gaps

**No tests exist (CRITICAL):**
- Issue: Zero test files in the entire codebase. No `*.test.*` or `*.spec.*` files. No test framework configured (no jest.config, vitest.config, etc.).
- Files: N/A (no test files exist)
- Risk: Any refactoring (especially the embedding removal or N+1 query fix) risks breaking functionality without any safety net. The STT hallucination detection, AI response parsing, backup/restore logic, and tag management are all untested.
- Priority: HIGH
- Fix approach: Add at minimum:
  1. Unit tests for `src/services/aiProcessor.ts` (`parseAIResponse`, `buildEmbeddingText`, hallucination detection)
  2. Unit tests for `src/services/stt.ts` (`isHallucination`, `stripTrailingHallucination`, `generateNameVariants`)
  3. Unit tests for `src/db/recordsDao.ts` and `src/db/tagsDao.ts` with an in-memory SQLite
  4. Unit tests for `src/services/backupService.ts` (JSON validation, merge logic)

## Dependencies at Risk

**`react-native-calendars` pinned to exact version (LOW):**
- Issue: `"react-native-calendars": "1.1314.0"` uses an unusual versioning scheme. This library has historically had breaking changes between minor versions.
- Files: `package.json`
- Impact: Upgrading may require calendar component changes.
- Fix approach: Monitor releases. Consider wrapping the Calendar usage in a thin adapter component.

---

*Concerns audit: 2026-03-30*
