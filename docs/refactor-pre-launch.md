# VibeDiary 출시 전 리팩토링 계획

> **이 문서 목적**: 새 Claude 세션이 컨텍스트 없이도 바로 작업을 시작할 수 있도록 배경 · 근거 · 실행 계획을 기록

- **작성일**: 2026-05-13
- **검토자**: Claude Code (Opus 4.7) + Codex (GPT-5.5 medium)
- **작업 상태**: 계획 확정, 미착수

---

## 배경

- iOS 1.0.4 build 6 TestFlight / Android versionCode 48 Play Console 내부 테스트 업로드 완료 (2026-05-12)
- **정식 출시 전** 코드 구조 정리 목적
- features/ 전면 도입(Codex 초안)은 부채 > 가치로 판단해 보류, 핀포인트 4개 작업만 진행

---

## 실제 발견된 문제 (근거 코드 포함)

### 🔴 문제 1: 순환 참조 (잠재 런타임 버그)

```
src/services/recordPipeline.ts:5   → import { addToOfflineQueue } from './offlineQueue'
src/services/offlineQueue.ts:8     → import { validateAndCleanStructuredData } from './recordPipeline'
```

- Hermes/Metro 번들러에서 모듈 로딩 순서에 따라 undefined 평가 가능
- 폴더 이동으로는 해결 안 됨 — 반드시 파일 분리로 풀어야 함

### 🟡 문제 2: AppNavigator 437줄, 실제 라우팅은 1/3뿐

`src/navigation/AppNavigator.tsx`에 useEffect 9개 혼재:

| 줄 범위 | 책임 |
|---------|------|
| 109–135 | 인앱 업데이트 체크 (fetch + Alert) |
| 137–203 | 백업 파일 import (ref + Linking 3개 useEffect) |
| 206–216 | 알림 카테고리/스케줄/응답 리스너 |
| 219–255 | sync 트리거 3종 (initial, foreground, network, session) |
| 257–390 | 실제 라우팅 (이게 본업) |

### 🟢 문제 3: screens/ 평면에 Settings* 8개

`src/screens/`에 SettingsAlarm, SettingsBackup, SettingsSyncDiagnostics, SettingsChildren, SettingsAiTag, SettingsHomeWidgets, SettingsPrivacy, SettingsHub — 8개가 평면에 섞임

### 🟢 문제 4: services/ 평면 14개, sync 관련 2파일 흩어짐

`syncService.ts` (883줄) + `offlineQueue.ts` (210줄)는 서브폴더로 묶어야 함
- 단, syncService를 분할하는 것은 계약 테스트 재설계 필요 → **이번 작업 범위 밖**

---

## 작업 범위 및 순서

### 사전: 데드코드 검사

```
/check-dead-code
```

작업 시작 전 실행. 발견 시 먼저 제거 후 진행.

---

### Phase A — 순환 참조 제거 ⭐ 최우선

**신규 파일 생성**: `src/services/recordValidation.ts`

이동할 코드: `src/services/recordPipeline.ts:21–92` (전체)
- `PARENT_TAG_MAP` 상수
- `validateAndCleanStructuredData()` 함수

```typescript
// src/services/recordValidation.ts (새 파일)
import { DEFAULT_TAGS } from '../db/schema';
import type { AIProcessingResult } from '../types/record';

const PARENT_TAG_MAP: Record<string, string> = { ... };  // 그대로 이동

export function validateAndCleanStructuredData(...) { ... }  // 그대로 이동
```

수정 파일 (2개):
- `src/services/recordPipeline.ts` — `PARENT_TAG_MAP`과 `validateAndCleanStructuredData` 제거, `from './recordValidation'` import 추가
- `src/services/offlineQueue.ts:8` — `from './recordPipeline'` → `from './recordValidation'`

**검증**: `npx tsc --noEmit` 통과

**커밋**: `refactor: validateAndCleanStructuredData 분리 — 순환 참조 제거`

---

### Phase B — AppNavigator side effect hook 추출

**위치**: `src/navigation/hooks/` (⚠️ `src/hooks/` 아님 — 이 훅들은 앱 부트스트랩 전용, 재사용 없음)

#### hook 4개

**`useUpdateCheck.ts`**
- 이동: `AppNavigator.tsx:41–49` (isOlderVersion 함수) + `109–135` (useEffect)
- 외부 의존: `Constants`, `Platform`, `Linking`, `Alert`, `process.env`
- 파라미터: 없음 (또는 최소)

**`useBackupFileImport.ts`**
- 이동: `AppNavigator.tsx:137–203` (handleIncomingFile + useEffect 3개)
- ⚠️ **중요**: `pendingFileUrl` ref를 훅 내부에서 소유 (`useRef` 훅 안에서 선언)
- 파라미터: `isLoaded: boolean`, `refreshChildren: () => Promise<void>`
- 외부 의존: `Linking`, `Alert`, `parseBackupFromUri`, `restoreOverwrite`, `restoreMerge`

**`useNotificationBootstrap.ts`**
- 이동: `AppNavigator.tsx:206–216` (useEffect)
- 파라미터: `isLoaded: boolean`
- 외부 의존: `expo-notifications`, `registerNotificationCategory`, `scheduleAlarms`, `handleNotificationResponse`

**`useSyncTriggers.ts`**
- 이동: `AppNavigator.tsx:219–255` (useEffect 3개 통합)
- 파라미터: `isLoaded: boolean`, `session: Session | null`
- 내부 ref: `appStateRef`, `prevConnectedRef`, `prevHasSessionRef` — 훅 내부 소유
- 외부 의존: `NetInfo`, `AppState`, `runInitialMigration`, `wakeSync`

**AppNavigator.tsx 결과**: 라우팅 + 4개 훅 호출만 남음 (~200줄 목표)

```typescript
// AppNavigator.tsx after
export default function AppNavigator() {
  const { colors } = useTheme();
  const { children: childList, isLoaded, refreshChildren } = useChild();
  const { session } = useAuth();

  useUpdateCheck();
  useBackupFileImport(isLoaded, refreshChildren);
  useNotificationBootstrap(isLoaded);
  useSyncTriggers(isLoaded, session);

  if (!isLoaded) { ... }
  return <NavigationContainer>...</NavigationContainer>;
}
```

**검증**:
1. `npx tsc --noEmit`
2. 실기기 5개 시나리오:
   - [ ] 앱 시작 → 업데이트 모달 (버전 낮춰서 테스트 or mock)
   - [ ] `.json` 파일 공유 → 백업 복원 모달
   - [ ] 알림 응답 → 인라인 답장 동작
   - [ ] 비행기 모드 ON→OFF → sync 깨어남 (SettingsSyncDiagnostics에서 확인)
   - [ ] 백그라운드 → 포그라운드 → sync 깨어남

**이후**: `/simplify` 실행 (추출한 훅 4개 코드 품질 점검)

**커밋**: `refactor: AppNavigator side effect를 navigation/hooks 4개로 분리`

---

### Phase D — screens/settings/ 서브폴더

**이동**: `src/screens/Settings*.tsx` 8개 → `src/screens/settings/`

```
src/screens/settings/
├── SettingsHubScreen.tsx
├── SettingsAlarmScreen.tsx
├── SettingsBackupScreen.tsx
├── SettingsSyncDiagnosticsScreen.tsx
├── SettingsChildrenScreen.tsx
├── SettingsAiTagScreen.tsx
├── SettingsHomeWidgetsScreen.tsx
└── SettingsPrivacyScreen.tsx
```

수정 파일 (1개):
- `src/navigation/AppNavigator.tsx` — import 8줄 경로 수정
  - `from '../screens/SettingsHubScreen'` → `from '../screens/settings/SettingsHubScreen'`
  - (나머지 7개 동일 패턴)

⚠️ Settings 화면끼리 서로 import하는지 확인:
```bash
grep -rE "from ['\"]\.\.?/Settings" src/screens/Settings*.tsx
```
있으면 해당 파일도 수정.

**검증**: `npx tsc --noEmit` + 설정 화면 8개 모두 진입 확인

**커밋**: `refactor: Settings 화면 screens/settings 서브폴더로 정리`

---

### Phase C — services/sync/ 서브폴더

#### 구조

```
src/services/sync/
├── syncService.ts      (그대로 이동)
├── offlineQueue.ts     (그대로 이동)
└── index.ts            (re-export)
```

```typescript
// src/services/sync/index.ts
export * from './syncService';
export * from './offlineQueue';
```

#### 수정 범위 (두 단계로 나눠서)

**Step 1: 이동된 파일 내부 경로 재조정** (⚠️ 가장 실수하기 쉬운 부분)

`src/services/sync/syncService.ts` 내부 (`../` → `../../`):
- `../lib/supabase` → `../../lib/supabase`
- `../db/database` → `../../db/database`
- `../db/appSettingsDao` → `../../db/appSettingsDao`

`src/services/sync/offlineQueue.ts` 내부:
- `./aiProcessor` → `../aiProcessor`
- `./syncService` → `./syncService` (**그대로** — 같은 폴더)
- `./recordPipeline` → `../recordPipeline` (또는 Phase A 후엔 `../recordValidation`)
- `../db/...` → `../../db/...`
- `../utils/...` → `../../utils/...`

**Step 2: 외부 import 수정** (17개 파일)

```bash
# 아래 파일들의 import 경로 수정
# '../services/syncService' or '../services/offlineQueue'
# → '../services/sync' (index.ts re-export 사용)
# 또는 named import 필요시 '../services/sync/syncService'
```

수정 대상:
```
src/db/childrenDao.ts
src/db/eventDao.ts
src/db/searchLogsDao.ts
src/db/tagsDao.ts
src/db/wikiDao.ts
src/components/PhotoActionModal.tsx
src/navigation/AppNavigator.tsx (또는 Phase B hook 파일들)
src/screens/FamilyShareScreen.tsx
src/screens/RecordDetailScreen.tsx
src/screens/SettingsAiTagScreen.tsx (이미 Phase D로 settings/로 이동됨)
src/screens/SettingsSyncDiagnosticsScreen.tsx (동일)
src/services/backupService.ts
src/services/photoService.ts
src/services/recordPipeline.ts
src/screens/CalendarScreen.tsx
src/screens/HomeScreen.tsx
src/screens/SettingsHubScreen.tsx (이미 settings/로 이동됨)
```

**Step 3: 계약 테스트 경로 수정**

`tests/sync/syncServiceContract.test.js` 4곳:
```javascript
// before
const source = read('src/services/syncService.ts');
// after
const source = read('src/services/sync/syncService.ts');
```

**검증**:
1. `npx tsc --noEmit`
2. `node --test tests/sync/syncServiceContract.test.js`
3. 실기기 sync 3개 시나리오:
   - [ ] 포그라운드 복귀 → sync
   - [ ] 네트워크 재연결 → sync
   - [ ] 기록 생성 → sync

**이후**: `/simplify` 실행

**커밋**: `refactor: syncService + offlineQueue를 services/sync 서브폴더로 이동`

---

### 사후: 최종 검증

```
/pre-release
```

---

## 절대 하지 말 것

- `features/` 전면 도입 — 이번 범위 밖, 위험/가치 판단 이미 완료
- `syncService.ts` 분할 — 계약 테스트 재설계 필요, 출시 후 과제
- DAO → services 역의존 제거 (event-emitter 방식) — 출시 후, triggerSync 옵션 패턴으로
- hook을 `src/hooks/`에 두기 — `src/navigation/hooks/`이어야 함
- 각 Phase 건너뛰고 한 번에 커밋 — Phase별 독립 커밋 필수

---

## CLAUDE.md 필수 절차 (매 커밋 전)

1. `STATE.md` 업데이트 (완료 작업 반영)
2. `git add STATE.md` — 같은 커밋에 포함
3. `npx tsc --noEmit` — pre-commit hook이 자동 실행

---

## 진행 추적

- [x] 사전: `/check-dead-code` — punycode 1개, 제거 보류 판단
- [x] Phase A: 순환 참조 제거 (7ba0a59)
- [x] Phase B: AppNavigator hook 추출 (7743cec)
- [x] Phase D: screens/settings 정리 (4dc183d)
- [x] Phase C: services/sync 이동 (bde5686)
- [x] 보안 quick fix (8ad2f57) — Worker /embedding 제거, URL 검증 강화, /version 1.0.4
- [x] Deno Deploy 재배포 완료 (2026-05-13)
- [x] 실기기 확인 완료 (2026-05-13): 설정 화면 8개 진입, 백업 복원 정상. sync 트리거/오프라인 실행은 오프라인 STT 불가 특성상 테스트 불가 — 리팩토링 회귀 아님
- [ ] 사후: `/pre-release`
