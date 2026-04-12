# STATE.md — 현재 작업 상태

> Claude Code 세션 간 코드 레벨 컨텍스트. 전략/제품 현황은 HQ.md 참조.

---

## 현재 위치

**마지막 커밋**: `chore: 슬래시 커맨드 4개 + knip 데드코드 탐지 설정` (2026-04-12)

**현재 브랜치**: main

**미커밋**: 없음

**DB 현재 버전**: v16 (app_settings)

---

## 최근 완료된 작업

- [x] 홈화면 위젯 토글: 설정탭에서 음성입력·텍스트입력·증상추적·최근기록 ON/OFF (DB v16 app_settings)
- [x] 폴더 구조 정리: synthesisDao.ts 삭제, 루트 PNG gitignore, 이벤트 DAO 3개 → eventDao.ts 통합
- [x] hooks 설정: aiProcessor.ts 수정 시 /check-ontology 배너, git commit 시 DB 변경 감지 배너
- [x] 슬래시 커맨드 4개: /check-ontology, /check-db-migration, /pre-release, /check-dead-code
- [x] knip v6.4.0 설치 + knip.json 설정 (현재 데드코드 없음)
- [x] 등대 인사이트 카드 마크다운 렌더링 (react-native-markdown-display)
- [x] 항해일지 탭 기록 장려 배지 (getAbsorbProgress, 1~9개 기록 시 표시)
- [x] 이벤트 추적 대규모 개선 (DB v13~v15): EventTrackerModal 스테이징 flow, severity 버튼, CalendarScreen 배지/삭제
- [x] RecordDetailScreen structured_data 한글 라벨 매핑
- [x] aiProcessor.ts ATEC/CARS/K-WISC flat 점수 추출
- [x] 항해일지 수동 생성: 타입 선택 모달, voyage/{type}/{date} slug
- [x] LLM Wiki 아키텍처 + wikiDao, absorbService, wikiLintService

---

## 다음 작업 (코드 레벨)

- [ ] 홈화면 위젯 토글 실기기 테스트 (각 섹션 OFF 확인, 재시작 유지 확인)
- [ ] 등대 추천 질문 템플릿 UI + 답변 공유 버튼
- [ ] 이벤트 추적 실기기 테스트 후 버전 bump → 배포

---

## 주요 파일 위치

| 역할 | 파일 |
|------|------|
| AI 프롬프트 | `src/services/aiProcessor.ts` |
| 녹음→AI→DB 파이프라인 | `src/services/recordPipeline.ts` |
| DB 스키마 / 마이그레이션 | `src/db/schema.ts` + `src/db/database.ts` |
| 등대 위키 | `src/services/absorbService.ts` + `src/db/wikiDao.ts` |
| 이벤트 추적 | `src/components/EventTrackerModal.tsx` + `src/db/eventDao.ts` |
| 홈 위젯 설정 | `src/constants/homeWidgets.ts` + `src/db/appSettingsDao.ts` + `src/hooks/useHomeWidgetSettings.ts` |
| 전역 라우팅 | `src/navigation/AppNavigator.tsx` |
| 테마/색상 | `src/constants/theme.ts` |
