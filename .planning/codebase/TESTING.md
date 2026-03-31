# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Runner:**
- Not configured. No test framework (Jest, Vitest, etc.) is installed or configured.
- No test-related scripts in `package.json`.
- No test config files (`jest.config.*`, `vitest.config.*`) exist.

**Assertion Library:**
- None installed.

**Run Commands:**
```bash
# No test commands available
# package.json scripts: start, android, ios, web, postinstall
```

## Test File Organization

**Location:**
- No test files exist in `src/`. No `__tests__/` directories, no `*.test.*` or `*.spec.*` files.

**Current State:**
- The project has zero automated tests. All quality assurance is manual testing on device/simulator.

## Quality Gates (Pre-Commit Hook)

The project compensates for missing tests with a pre-commit hook at `.git/hooks/pre-commit` that enforces two checks:

**1. TypeScript Type Check:**
```bash
npx tsc --noEmit
```
- Uses strict TypeScript (`"strict": true` in `tsconfig.json`)
- Additional strictness: `noUnusedLocals: true`, `noUnusedParameters: true`
- Blocks commit if any type errors exist

**2. STATE.md Inclusion Check:**
- Every commit must include `STATE.md` updates
- Blocks commit if `STATE.md` is not staged

**3. Ontology Reminder (non-blocking):**
- If staged files match `aiProcessor|tags|prompt|stt`, prints a warning to verify consistency with `../aiseossi-knowledge/ontology.md`
- Advisory only; does not block the commit

**TypeScript Configuration** (`tsconfig.json`):
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "exclude": ["node_modules", "cloudflare-worker"]
}
```

## Linting & Formatting

**ESLint:**
- Not configured. No `.eslintrc*` or `eslint.config.*` files present.
- No `eslint` in devDependencies.

**Prettier:**
- Not configured. No `.prettierrc*` or `prettier.config.*` files present.
- No `prettier` in devDependencies.

**Biome:**
- Not configured.

**Summary:** The only static analysis is TypeScript's built-in type checker via `tsc --noEmit`, enforced by the pre-commit hook.

## CI/CD Pipeline

**GitHub Actions:**
- `.github/workflows/` directory exists but is empty. No CI workflows are configured.

**Build & Deploy:**
- Uses EAS (Expo Application Services) for builds, configured in `eas.json`
- Build profiles: `development`, `development-simulator`, `preview`, `production`
- `production` profile has `"autoIncrement": true` for version bumping
- App version source: `"remote"` (managed by EAS)
- EAS CLI version requirement: `>= 18.0.6`
- Builds are triggered manually via `eas build` commands (no automated CI trigger)

**EAS Ignore** (`.easignore`):
- Exists to exclude build artifacts (`build-*.apk`, `/apk`) from EAS uploads

## Coverage

**Requirements:** None enforced. No coverage tooling installed.

## Recommendations for Adding Tests

If tests are introduced, follow these patterns based on the existing stack:

**Recommended Setup:**
- Framework: Jest (ships with Expo preset support via `jest-expo`)
- Install: `npx expo install jest-expo jest @types/jest`
- Config: Add `"jest": { "preset": "jest-expo" }` to `package.json`

**Priority Test Targets (highest value):**
1. `src/services/recordPipeline.ts` — Core STT+AI+DB pipeline; complex async flow
2. `src/services/aiProcessor.ts` — Gemini prompt construction, JSON parsing with fallbacks
3. `src/services/stt.ts` — Silence detection, hallucination filtering logic
4. `src/db/recordsDao.ts` — Database CRUD operations
5. `src/services/offlineQueue.ts` — Queue retry logic with async locks

**Test File Placement:**
- Co-locate with source: `src/services/__tests__/stt.test.ts`
- Or: `src/services/stt.test.ts`

**Add test script to `package.json`:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watchAll",
    "test:coverage": "jest --coverage"
  }
}
```

---

*Testing analysis: 2026-03-30*
