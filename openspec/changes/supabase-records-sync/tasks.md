## 1. Supabase 테이블 및 RLS 설정

- [x] 1.1 Supabase SQL Editor에서 records 테이블 생성 (user_id, family_id 포함)
- [x] 1.2 tags, record_tags, children 테이블 생성
- [x] 1.3 records RLS 정책: 본인 기록 INSERT/UPDATE/DELETE
- [x] 1.4 records RLS 정책: 가족 멤버 SELECT (is_family_member 함수 활용)
- [x] 1.5 tags, record_tags, children RLS 정책 (SECURITY DEFINER 함수로 처리)

## 2. syncService.ts 구현

- [x] 2.1 src/services/syncService.ts 파일 생성
- [x] 2.2 syncRecord(recordId): 단일 기록 + tags Supabase upsert
- [x] 2.3 syncPendingRecords(): is_synced=0 기록 일괄 업로드 (50건 배치)
- [x] 2.4 runInitialMigration(): appSettings is_initial_migration_done 체크 후 최초 1회 실행

## 3. recordsDao / recordPipeline 연동

- [x] 3.1 recordsDao.ts createRecord 후 syncRecord 비동기 호출 (await 없이 fire-and-forget)
- [x] 3.2 recordPipeline.ts 저장 완료 후 syncRecord 트리거 (createRecord 결과 ID 활용)
- [x] 3.3 appSettingsDao.ts에 is_initial_migration_done 키 추가

## 4. 앱 시작 시 마이그레이션 트리거

- [x] 4.1 AppNavigator.tsx 또는 App.tsx에서 앱 마운트 시 runInitialMigration() 호출

## 5. FamilyFeedScreen 구현

- [x] 5.1 src/screens/FamilyFeedScreen.tsx 생성
- [x] 5.2 Supabase records 조회 (같은 family_id, 최신순 50건)
- [x] 5.3 FeedCard 컴포넌트: 작성자, 시각, 요약, 태그, 사진 썸네일 표시
- [x] 5.4 Pull-to-refresh 구현
- [x] 5.5 가족방 미가입 빈 상태 UI
- [x] 5.6 가족 멤버 기록 없음 빈 상태 UI

## 6. 내비게이션 및 진입점 추가

- [x] 6.1 AppNavigator.tsx에 FamilyFeedScreen 등록
- [x] 6.2 SettingsScreen 가족 공유 섹션에 "함께 보기" 버튼 추가 (가족방 참여 시)

## 7. 타입 체크 및 마무리

- [x] 7.1 npx tsc --noEmit 통과 확인
- [ ] 7.2 STATE.md 업데이트 + 커밋
