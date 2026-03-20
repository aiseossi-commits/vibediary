## Why

돌봄 기록은 가족 공동의 데이터다. 현재 바다 앱은 로컬 SQLite 기반이라 기록이 한 기기에 갇혀있다. 엄마가 기록하면 아빠 폰에서도 볼 수 있어야 하고, 삭제/수정도 동기화되어야 한다. 서버 인프라를 최소화하면서 데이터 유실 없는 공유 방식이 필요하다.

## What Changes

- **이벤트 로그 기반 동기화**: 기록의 생성/수정/삭제를 이벤트로 서버에 append-only 저장. 각 기기는 마지막 동기화 이후의 이벤트만 받아서 순서대로 적용.
- **가족 공유 ID**: 가족이 하나의 ID를 공유하여 같은 이벤트 로그에 접근. 별도 인증/계정 시스템 불필요.
- **Deno KV 저장소**: 기존 Deno Deploy 인프라에 KV 엔드포인트 추가. 서버 비용 $0 (무료 1GB, 가족당 연 3.6MB).
- **앱 동기화 UI**: 설정 화면에 가족 ID 입력 + 동기화 버튼. 앱 포그라운드 진입 시 자동 동기화 옵션.

## Capabilities

### New Capabilities
- `family-sync-server`: Deno Deploy에 이벤트 로그 엔드포인트 추가 (PUT 이벤트 추가, GET since:N 조회). Deno KV 저장. 가족 ID(8자리 영숫자) 기반 접근.
- `family-sync-client`: 앱에서 기록 생성/수정/삭제 시 이벤트 생성 + 서버 전송. 동기화 시 새 이벤트 수신 + 로컬 DB 적용. lastSync 시퀀스 관리.
- `family-sync-ui`: 설정 화면에 가족 공유 섹션 — ID 생성, ID 입력, 동기화 버튼, 마지막 동기화 시각 표시.

### Modified Capabilities
<!-- 기존 기록 CRUD 로직(recordsDao, recordPipeline)에 이벤트 발행 훅이 추가되지만, 기존 동작의 요구사항 자체는 변하지 않으므로 modified capability 없음 -->

## Impact

- **서버**: `deno-main.ts`에 `/sync` 엔드포인트 2개 추가, Deno KV 의존성 추가
- **앱 서비스**: 새 `syncService.ts` — 이벤트 생성, 업로드, 다운로드, 로컬 적용
- **앱 DB**: `sync_meta` 테이블 추가 (familyId, lastSeq) — 기존 테이블 변경 없음
- **앱 UI**: `SettingsScreen.tsx`에 가족 공유 섹션 추가
- **기존 기능**: recordsDao의 create/update/delete에 이벤트 발행 연동 (기존 로직 변경 최소화)
- **보안**: 가족 ID 8자리 = 2.8조 조합, X-App-Secret 인증 유지, 90일 미접근 데이터 자동 삭제
