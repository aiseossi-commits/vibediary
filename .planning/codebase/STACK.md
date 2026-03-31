# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- TypeScript (strict mode) - All application code (`tsconfig.json`: `strict: true`, `noUnusedLocals`, `noUnusedParameters`)

**Secondary:**
- JavaScript - Build configuration (`babel.config.js`, `metro.config.js`)

## Runtime

**Environment:**
- React Native 0.83.2 via Expo SDK 55
- Node.js (development tooling)
- Deno Deploy (backend proxy: `cloudflare-worker/deno-main.ts`)

**Package Manager:**
- npm (inferred from `package-lock.json` absence check; `postinstall` uses `patch-package`)
- Lockfile: uses standard npm lockfile

## Frameworks

**Core:**
- React 19.2.0 - UI rendering
- React Native 0.83.2 - Native platform bridge
- Expo ~55.0.5 - Managed native workflow, build system, OTA updates
- React Navigation 7.x - Screen routing (`@react-navigation/native` 7.1.31, `@react-navigation/bottom-tabs` 7.15.2, `@react-navigation/native-stack` 7.14.2)

**Testing:**
- Not detected - No test framework in `devDependencies`

**Build/Dev:**
- EAS Build (CLI >= 18.0.6) - Cloud builds for iOS/Android (`eas.json`)
- Metro bundler - Default Expo config with `.wasm` asset support (`metro.config.js`)
- Babel (babel-preset-expo) - JSX automatic runtime, Reanimated plugin (`babel.config.js`)
- patch-package 8.0.1 - Post-install patches (`patches/expo-sharing+55.0.11.patch`)
- TypeScript 5.9.3 - Type checking (pre-commit hook runs `npx tsc --noEmit`)

## Key Dependencies

**Critical:**
- `expo-sqlite` ~55.0.11 - Local SQLite database, sole data persistence layer (`src/db/database.ts`)
- `expo-av` 16.0.8 - Audio recording (m4a format, metering callbacks) (`src/services/audioRecorder.ts`)
- `expo-speech-recognition` 3.1.1 - iOS native STT, file-based recognition (`src/services/stt.ts`)
- `expo-file-system` ~55.0.11 - File I/O for audio files, backup export/import (`src/services/backupService.ts`)
- `@react-native-community/netinfo` 11.5.2 - Network connectivity detection (`src/utils/network.ts`)

**UI:**
- `react-native-calendars` 1.1314.0 - Calendar view for monthly records (`CalendarScreen`)
- `react-native-reanimated` 4.2.1 - Animations (requires Babel plugin)
- `react-native-screens` 4.23.0 - Native screen containers for navigation
- `react-native-safe-area-context` 5.6.2 - Safe area insets
- `@expo/vector-icons` 15.1.1 - Icon library
- `react-native-worklets` ^0.7.4 - Worklet threading for Reanimated

**Utility:**
- `expo-crypto` ~55.0.10 - UUID generation for record IDs (`src/services/audioRecorder.ts`, `src/services/backupService.ts`)
- `expo-clipboard` ~55.0.9 - Clipboard access
- `expo-sharing` ~55.0.14 - Native share sheet (patched: `patches/expo-sharing+55.0.11.patch`)
- `expo-document-picker` ~55.0.9 - File picker for backup import
- `expo-application` ~55.0.10 - App version info
- `expo-status-bar` 55.0.4 - Status bar styling
- `expo-font` 55.0.4 - Custom font loading
- `expo-dev-client` ~55.0.18 - Development client for native module testing

**Production optimization:**
- `babel-plugin-transform-remove-console` ^6.9.4 - Strips `console.*` in production builds (`babel.config.js`)

## Configuration

**TypeScript:**
- Config: `tsconfig.json` (extends `expo/tsconfig.base`)
- Path alias: `@/*` maps to `src/*`
- Excludes: `node_modules`, `cloudflare-worker`

**Environment:**
- `.env` file present - Contains `EXPO_PUBLIC_WORKER_URL` and `EXPO_PUBLIC_WORKER_SECRET`
- `.env.example` - Template with placeholder values
- All client env vars use `EXPO_PUBLIC_` prefix (bundled into client)

**Build (EAS):**
- `eas.json` - Profiles: `development` (dev client, internal), `development-simulator` (APK), `preview` (internal), `production` (auto-increment)
- `app.json` - Expo config: slug `vibediary`, owner `aiseossi`, EAS project ID `c43c1e17-f436-44d9-95ee-ed1cdad398b3`
- iOS: bundle ID `com.aiseossi.vibediary`, build number 4
- Android: package `com.aiseossi.vibediary`, versionCode 6

**Metro:**
- `metro.config.js` - Adds `.wasm` to asset extensions (expo-sqlite web support)

**Babel:**
- `babel.config.js` - `babel-preset-expo` with automatic JSX runtime, `react-native-reanimated/plugin`, production console removal

## Platform Requirements

**Development:**
- macOS (iOS builds require Xcode)
- EAS CLI >= 18.0.6
- Expo Dev Client for native module testing (expo-speech-recognition, expo-sqlite)

**Production:**
- iOS: TestFlight distribution (build 5 deployed)
- Android: Google Play Internal Testing (versionCode 6)
- Backend: Deno Deploy (`vibediary.aiseossi-commits.deno.net`)

**Target Platforms:**
- iOS (primary) - Native STT support, portrait orientation
- Android - Whisper fallback for STT (no native file-based STT), portrait orientation
- Web (partial) - `react-native-web` 0.21.2 included but secondary target

---

*Stack analysis: 2026-03-30*
