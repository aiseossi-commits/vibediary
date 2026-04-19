## 1. DB 스키마

- [x] 1.1 `src/db/schema.ts`에 v17 마이그레이션 추가 — app_settings가 key-value 테이블이므로 스키마 변경 불필요, getSetting/setSetting으로 처리
- [x] 1.2 `src/db/database.ts`에 v17 마이그레이션 실행 블록 추가 — 불필요 확인

## 2. DAO

- [x] 2.1 `src/db/appSettingsDao.ts`에 `getAIUsage()` 함수 추가 — `{ count, month }` 반환
- [x] 2.2 `src/db/appSettingsDao.ts`에 `incrementAIUsage()` 함수 추가 — 월이 바뀌었으면 리셋 후 증가, 같은 달이면 count+1
- [x] 2.3 월 리셋 로직을 incrementAIUsage 내부에서 처리 (별도 함수 불필요)

## 3. 훅

- [x] 3.1 `src/hooks/useAIUsage.ts` 신규 생성 — `{ usageCount, remaining, isPremium, canUseAI, checkAndIncrement }` 반환
- [x] 3.2 `checkAndIncrement()`: 한도 초과면 Alert 표시 후 false 반환, 아니면 increment 후 true 반환

## 4. UI — 모아보기 (SearchScreen)

- [x] 4.1 `useAIUsage` 훅 연결
- [x] 4.2 인사이트 생성 버튼 탭 시 `checkAndIncrement()` 호출 — false면 생성 중단
- [x] 4.3 무료 유저 대상 "이번 달 AI N회 남음" 텍스트를 generateBtn 위에 표시
- [x] 4.4 `remaining === 0`이면 generateBtn 비활성화

## 5. UI — 물어보기 (SearchScreen 채팅)

- [x] 5.1 질문 전송 핸들러에 `checkAndIncrement()` 호출 추가 — false면 전송 중단
- [x] 5.2 `remaining === 0`이면 전송 버튼 비활성화

## 6. 검증

- [x] 6.1 `npx tsc --noEmit` 통과 확인
- [x] 6.2 `/check-db-migration` 실행하여 마이그레이션 불필요 확인
