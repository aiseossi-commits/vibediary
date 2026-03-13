## 1. DB 스키마 및 마이그레이션

- [x] 1.1 `schema.ts`에 `CREATE_CHILDREN_TABLE` SQL 추가 (`id TEXT PK`, `name TEXT NOT NULL`, `created_at INTEGER`)
- [x] 1.2 `schema.ts`의 `CREATE_RECORDS_TABLE`에 `child_id TEXT` 컬럼 추가
- [x] 1.3 `database.ts`에 `PRAGMA user_version` 기반 마이그레이션 추가 (버전 0→1: children 테이블 생성 + records에 child_id ALTER TABLE)

## 2. ChildrenDao

- [x] 2.1 `src/db/childrenDao.ts` 생성: `createChild(name)`, `getAllChildren()`, `updateChild(id, name)`, `deleteChild(id)` 구현
- [x] 2.2 `src/db/index.ts`에 childrenDao export 추가

## 3. ChildContext

- [x] 3.1 `src/context/ChildContext.tsx` 생성: `children`, `activeChild`, `setActiveChild`, `refreshChildren` 제공
- [x] 3.2 `setActiveChild` 호출 시 `app_settings.json`에 `activeChildId` 저장
- [x] 3.3 앱 시작 시 `app_settings.json`에서 `activeChildId` 로드하여 복원
- [x] 3.4 `App.tsx`에 `ChildProvider` 추가 (ThemeProvider 안쪽)

## 4. 기록 DAO 수정

- [x] 4.1 `recordsDao.ts`의 `createRecord`에 `childId?: string | null` 파라미터 추가, INSERT에 반영
- [x] 4.2 `recordsDao.ts`의 `getAllRecords`에 `childId?: string` 파라미터 추가: string이면 WHERE child_id = ?, undefined면 필터 없음
- [x] 4.3 `recordPipeline.ts` 등 createRecord 호출부에서 `useChild()`의 `activeChild?.id` 전달

## 5. 홈 화면 수정

- [x] 5.1 `HomeScreen.tsx`에서 `useChild()` 훅으로 `activeChild`, `children` 가져오기
- [x] 5.2 제목 텍스트: `activeChild ? \`${activeChild.name}의 바다\` : '바다'`
- [x] 5.3 `getAllRecords` 호출 시 `activeChild?.id` 전달
- [x] 5.4 아이가 2명 이상일 때 헤더 제목 옆에 전환 버튼 표시, 누르면 Alert로 아이 선택

## 6. 설정 화면 — 아이 관리

- [x] 6.1 `SettingsScreen.tsx`에 아이 목록 섹션 추가: 등록된 아이 목록 표시
- [x] 6.2 아이 추가 버튼: Modal TextInput으로 이름 입력 → `createChild` → `refreshChildren`
- [x] 6.3 아이 항목 탭: 수정(이름 변경) / 삭제 선택 Alert 표시
- [x] 6.4 아이 선택(활성 전환) UI: 현재 활성 아이에 체크 표시

## 7. 검증

- [ ] 7.1 아이 등록 → 홈 화면 제목 변경 확인
- [ ] 7.2 아이 전환 → 해당 아이 기록만 표시 확인
- [ ] 7.3 기존 기록(child_id NULL) 보존 및 아이 없음 상태에서 전체 표시 확인
- [ ] 7.4 아이 삭제 → 기록 보존, 제목 "바다" 복귀 확인
<!-- 검증은 빌드 후 기기 테스트로 진행 -->
