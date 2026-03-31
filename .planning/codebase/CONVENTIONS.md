# Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- Screen components: PascalCase with `Screen` suffix (e.g., `HomeScreen.tsx`, `CalendarScreen.tsx`, `RecordDetailScreen.tsx`)
- Service modules: camelCase (e.g., `aiProcessor.ts`, `recordPipeline.ts`, `offlineQueue.ts`)
- DAO modules: camelCase with `Dao` suffix (e.g., `recordsDao.ts`, `tagsDao.ts`, `childrenDao.ts`)
- Context providers: PascalCase with `Context` suffix (e.g., `ThemeContext.tsx`, `ChildContext.tsx`)
- Components: PascalCase (e.g., `RecordCard.tsx`, `TagChip.tsx`, `WaveLoader.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useRecording.ts`)
- Type definition files: camelCase (e.g., `record.ts`)
- Constants: camelCase (e.g., `theme.ts`)
- Utilities: camelCase (e.g., `network.ts`)

**Functions:**
- Use camelCase for all functions: `processWithAI`, `getNetworkState`, `createRecord`
- Prefix boolean-returning functions with `is`/`has`: `isDatabaseReady()`, `hasChildren`
- Prefix getter functions with `get`: `getDatabase()`, `getAllRecords()`, `getTagsForRecord()`
- Event handlers: `handle` prefix: `handleRefresh`, `handleRecordPress`, `handleTextSubmit`
- Builder/factory functions: `build`/`create` prefix: `buildSystemPrompt()`, `createFallbackResult()`, `createStyles()`

**Variables:**
- camelCase for all local variables and state: `isLoading`, `activeChild`, `textInput`
- Boolean state variables use `is`/`has`/`show` prefix: `isRecording`, `isPaused`, `showEmptyState`
- Refs use `Ref` suffix: `timerRef`, `activeChildIdRef`, `avgLevelRef`
- Constants (module-level) use SCREAMING_SNAKE_CASE: `PAGE_SIZE`, `PEARL_SIZE`, `PULSE_COUNT`, `API_ERROR_COOLDOWN_MS`

**Types/Interfaces:**
- PascalCase for all types and interfaces: `DiaryRecord`, `RecordWithTags`, `AIProcessingResult`
- Interface props use `Props` suffix: `HomeScreenProps`, `RecordCardProps`, `TagChipProps`
- Context value interfaces use `ContextValue` or `Value` suffix: `ThemeContextValue`, `ChildContextValue`
- Enum-like types use PascalCase union: `PaletteKey`, `ThemeMode`

## Code Style

**Formatting:**
- No ESLint or Prettier config files -- formatting is manual/editor-based
- Indentation: 2 spaces
- Semicolons: always used
- Quotes: single quotes for strings
- Trailing commas: used in multi-line objects and arrays
- Max line length: no enforced limit, but lines tend to stay under 140 characters

**Linting:**
- No ESLint configuration present
- TypeScript strict mode serves as the primary static analysis tool
- `tsconfig.json` enforces: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- Pre-commit hook runs `npx tsc --noEmit` to catch type errors

**Console removal:**
- Production builds strip `console.*` calls via `babel-plugin-transform-remove-console` (configured in `babel.config.js`)

## Import Organization

**Order:**
1. React and React Native imports (`react`, `react-native`, `react-native-*`)
2. Expo SDK imports (`expo-*`)
3. Third-party navigation/UI imports (`@react-navigation/*`, `@expo/vector-icons`)
4. Local context imports (`../context/*`)
5. Local constants/theme imports (`../constants/theme`)
6. Local type imports (`../types/*`)
7. Local service/db imports (`../services/*`, `../db/*`)
8. Local component imports (`../components/*`)

**Type imports:**
- Use `import type` for type-only imports consistently: `import type { RecordWithTags } from '../types/record'`
- Mixed imports split type and value: `import { SPACING, type AppColors } from '../constants/theme'`

**Path Aliases:**
- `@/*` maps to `src/*` (configured in `tsconfig.json` paths), but **not actively used** in source code
- All imports use relative paths: `../services/aiProcessor`, `../context/ThemeContext`

**Barrel files:**
- `src/db/index.ts` re-exports from all DAO modules and database module
- No other barrel files detected

## Error Handling

**Patterns:**

1. **try-catch with fallback** (services layer):
```typescript
try {
  aiResult = await processWithAI(text, customTags);
} catch (e) {
  console.error('[Pipeline] AI 처리 실패:', e);
  aiResult = createFallbackResult(text);
  aiPending = true;
}
```

2. **Silent catch for non-critical operations:**
```typescript
.catch(() => {});  // File writes, settings persistence, pings
```

3. **Error string matching for specific handling:**
```typescript
const msg = error instanceof Error ? error.message : '';
if (msg === 'NO_SPEECH') { ... }
if (errMsg.includes('429')) { ... }
```

4. **JSON.parse always wrapped in try-catch** (enforced by CLAUDE.md):
```typescript
try { return row.structured_data ? JSON.parse(row.structured_data) : null; }
catch { return null; }
```

5. **Async lock with try/finally** (enforced by CLAUDE.md):
```typescript
isProcessingQueue = true;
try {
  // ... processing logic
} finally {
  isProcessingQueue = false;
}
```

6. **AbortController for network timeouts:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 25000);
try {
  response = await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeoutId);
}
```

7. **Console logging with module prefix:**
```typescript
console.error('[AI] Gemini 오류:', ...);
console.error('[Home] loadRecords error:', ...);
console.warn('[ChildContext] 아이 목록 로드 실패:', ...);
```

## Logging

**Framework:** `console.*` (no logging library)

**Patterns:**
- Use `console.error` for failures that affect user flow
- Use `console.warn` for recoverable errors
- Prefix all log messages with `[ModuleName]` for traceability
- All console calls are stripped in production via `transform-remove-console` babel plugin
- Korean-language log messages are acceptable

## Component Patterns

**Screen components:**
- Default export as a named function: `export default function HomeScreen({ navigation }: HomeScreenProps)`
- Props interface defined above the component
- `useMemo` for styles derived from theme colors
- `useCallback` for all event handlers and render functions

**Reusable components:**
- Default export, optionally wrapped with `React.memo`: `export default React.memo(RecordCard)`
- Props interface defined with explicit types (no `any` for public APIs)
- Static StyleSheet at module level for theme-independent styles (`TagChip`)

**Context providers:**
- Each context module exports a `Provider` component and a `use*` hook
- Pattern: `ThemeProvider` + `useTheme()`, `ChildProvider` + `useChild()`
- Default context value always provided (with no-op functions)

**Custom hooks:**
- Named export (not default): `export function useRecording()`
- Return an interface-typed object
- Clean up side effects in `useEffect` return

## State Management

**Approach:** React Context + useState (no Redux, no Zustand)

**Global state (via Context):**
- `ThemeContext` -- colors, palette, dark/light mode
- `ChildContext` -- active child, child list, refresh function

**Local state:** `useState` in screen components for UI state (loading, modal visibility, form inputs)

**Persistence:**
- Theme and active child settings persisted to `app_settings.json` via `expo-file-system`
- All record data persisted to SQLite via DAO layer
- No AsyncStorage usage

**Data fetching pattern:**
- `useFocusEffect` for loading data when screen becomes focused
- `useCallback` wrapping async load functions
- Separate `isLoading` / `isRefreshing` states for initial load vs pull-to-refresh

## Styling Patterns

**Theme system:**
- All colors come from `useTheme().colors` object -- never hardcode color values
- 8 palette options with dark/light variants defined in `src/constants/theme.ts`
- Color type: `AppColors` interface with 30+ named color tokens

**Design tokens (from `src/constants/theme.ts`):**
- `SPACING`: `{ xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 56 }`
- `FONT_SIZE`: `{ xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, title: 28 }`
- `FONT_WEIGHT`: `{ regular: '400', medium: '500', semibold: '600', bold: '700' }`
- `BORDER_RADIUS`: `{ sm: 8, md: 12, lg: 16, xl: 24, extraLarge: 32, full: 999 }`
- `SHADOW`: `{ sm, md, lg }` with platform-specific shadow properties
- `TOUCH_TARGET`: `{ min: 48, recordButton: 96, fab: 56 }`
- `TYPOGRAPHY`: `{ h1, h2 }` with Pretendard font family

**StyleSheet pattern for themed screens:**
```typescript
function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // ...
  });
}

export default function SomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // ...
}
```

**StyleSheet pattern for static components (no theme dependency in styles):**
```typescript
const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.full,
  },
});

export default function TagChip() {
  const { colors } = useTheme();
  // Apply colors inline: style={{ backgroundColor: colors.surface }}
}
```

**Rules:**
- Use `createStyles(colors)` pattern for components with many themed styles
- Wrap with `useMemo(() => createStyles(colors), [colors])` to avoid re-creation
- Use design tokens (`SPACING`, `FONT_SIZE`, etc.) instead of magic numbers
- Some inline styles exist in `AppNavigator.tsx` loading screen -- prefer extracting to StyleSheet

## TypeScript Usage

**Strict mode:** Enabled via `tsconfig.json` with `strict: true`, `noUnusedLocals`, `noUnusedParameters`

**Type patterns:**
- Interfaces for object shapes: `interface DiaryRecord { ... }`
- `type` for unions and aliases: `type PaletteKey = 'sage' | 'emerald' | ...`
- Use `as const` for constant objects to get literal types
- `any` used sparingly for DB row results and navigation props -- prefer typed alternatives

**Common type casts:**
- `fontWeight: '600' as const` -- required for React Native StyleSheet type compatibility
- DB rows typed as `any` then mapped through converter functions (e.g., `mapRowToRecordWithTags`)

**Generics usage:**
- `db.getFirstAsync<{ count: number }>(...)` for typed SQL results
- `db.getAllAsync<Tag>(...)` for typed array results

## Comments

**When to Comment:**
- Korean comments for business logic explanations
- Module-level doc comments describing purpose: `// AI 처리를 위한 시스템 프롬프트 (고정)`
- Inline comments for non-obvious decisions: `// CASCADE로 record_tags도 자동 삭제`
- Configuration rationale: `// 4분` next to `PING_INTERVAL`

**Style:**
- Single-line `//` comments (no JSDoc/TSDoc)
- Comments in Korean matching the Korean-language codebase
- No commented-out code (enforced by CLAUDE.md: "완전 삭제")

## Module Design

**Exports:**
- Screens: single default export
- Services: named exports for all public functions
- Components: default export (optionally `React.memo` wrapped)
- Contexts: named exports for `Provider` component and `use*` hook
- Types: named exports for all interfaces/types
- DB layer: named exports, re-exported through barrel `src/db/index.ts`

**Internal functions:**
- Module-private helper functions (not exported) are placed before public functions
- Example: `float32ToBlob`, `blobToFloat32` in `src/db/recordsDao.ts`

---

*Convention analysis: 2026-03-30*
