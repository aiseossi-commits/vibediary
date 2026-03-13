## Why

앱을 여러 아이를 위해 사용할 때 기록이 섞이는 문제가 있다. 아이별로 프로필을 등록하고 기록을 분리하면, 각 아이의 성장 기록을 독립적으로 관리할 수 있다.

## What Changes

- 아이 프로필 등록/수정/삭제 (설정 화면)
- 활성 아이 전환 (홈 화면 헤더 또는 설정)
- 홈 화면 제목: "바다" → "[이름]의 바다"
- 기록(records)에 child_id 컬럼 추가 — 기존 기록은 NULL(미지정) 유지
- 아이별 기록 필터링: 활성 아이의 기록만 표시

## Capabilities

### New Capabilities
- `child-management`: 아이 프로필 등록/수정/삭제 및 활성 아이 전환
- `child-data-isolation`: 활성 아이 기준으로 기록 필터링

### Modified Capabilities

## Impact

- `src/db/schema.ts`: `children` 테이블 추가, `records`에 `child_id` 컬럼 추가
- `src/db/recordsDao.ts`: `childId` 파라미터로 기록 필터링
- `src/db/childrenDao.ts`: 신규 — 아이 CRUD
- `src/context/ChildContext.tsx`: 신규 — 활성 아이 상태 관리 및 전역 제공
- `src/screens/HomeScreen.tsx`: 헤더 제목 변경, 아이 전환 버튼
- `src/screens/SettingsScreen.tsx`: 아이 관리 섹션 추가
- `App.tsx`: ChildProvider 추가
