## Why

무료 유저의 AI 호출(등대 질문 + AI 인사이트 생성)을 월 10회로 제한해 서버 비용을 통제하고, 유료 전환 동기를 만든다. 지금은 제한 없이 호출되어 헤비 무료 유저가 비용을 유발한다.

## What Changes

- `app_settings` DB 테이블에 `ai_usage_count`(당월 호출 수)와 `ai_usage_month`(YYYY-MM) 컬럼 추가
- 등대 질문 전송 전 카운터 확인 → 한도 초과 시 차단
- AI 인사이트 생성 버튼 탭 전 카운터 확인 → 한도 초과 시 차단
- 한도 초과 시 업그레이드 유도 Alert 표시 ("이번 달 AI 사용 횟수를 모두 사용했어요")
- 유료 유저는 카운터 무시 (isPremium 플래그, 초기에는 항상 false — 결제 시스템은 별도 구현)
- 매월 1일 자동 초기화 (호출 시점에 월이 바뀌었으면 리셋)

## Capabilities

### New Capabilities
- `ai-usage-counter`: 월별 AI 호출 횟수 추적, 무료 한도(10회) 적용, 초과 시 차단 및 업그레이드 유도

### Modified Capabilities
- `chat-bubble-ui`: 등대 질문 전송 시 카운터 차감 로직 추가

## Impact

- `src/db/schema.ts` — DB v17 마이그레이션 추가
- `src/db/appSettingsDao.ts` — 카운터 read/increment/reset 함수 추가
- `src/screens/SearchScreen.tsx` — 질문 전송·인사이트 생성 전 카운터 확인
- 신규: `src/hooks/useAIUsage.ts` — 카운터 상태 관리 훅
