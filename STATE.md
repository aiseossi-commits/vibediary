# STATE.md — 현재 작업 상태

> Claude Code 세션 간 코드 레벨 컨텍스트. 전략/제품 현황은 HQ.md 참조.

---

## 현재 위치

**마지막 커밋**: `chore: Android 로컬 빌드 스크립트 + eas.json preview-apk 프로파일 추가` (2026-04-13)

**현재 브랜치**: main

**미커밋**: App.tsx, app.json, CalendarScreen.tsx, RecordDetailScreen.tsx, TagsScreen.tsx, iOS splash 이미지, scripts/generate-splash.js, package.json (sharp 추가)
**미커밋 미분류**: openspec/changes/long-press-actions/, openspec/changes/unified-splash-screen/, src/components/SplashOverlay.tsx (미사용, 삭제 가능)

**DB 현재 버전**: v16 (app_settings)

---

## 최근 완료된 작업

- [x] 등대 답변 형식 AI 자율 판단 + maxOutputTokens 1500 (경과/빈도/최근 질문별 자동 구조화)
- [x] 등대/항해일지 포지션 재정립: 등대탭=자동인사이트+항해일지생성+채팅, 항해일지탭=저장된 등대답변 (search_logs), AssistantBubble 저장 버튼 추가
- [x] TagsScreen 카테고리 섹션 그룹핑: 치료/투약/신체·증상/행동·정서/기타/내 태그 6개 섹션, 기존 필터링·롱프레스 편집 유지
- [x] 기존 기록 태그 재분석 버튼: 설정 > AI 태그 관리, getTagsOnly(경량 프롬프트) 사용, 하루 1회 제한 (last_retag_at → app_settings), 진행률 표시 (N/M)
- [x] 스플래시 화면 통일: native 이미지에 "기록에 치이지 말고, 그냥 말하세요" 텍스트 임베드 (generate-splash.js, sharp), JS SplashOverlay 방식 폐기, App.tsx DB 로딩 중 어두운 배경 View로 흰 화면 플래시 제거
- [x] long-press 액션 (openspec long-press-actions 완료): TagsScreen 롱프레스 인라인 ✎×, CalendarScreen 롱프레스 Bottom Sheet 삭제, RecordDetailScreen ⋯ 버튼 + 태그/원문 섹션 롱프레스 편집
- [x] 등대 답변 공유 버튼 (OS 공유 시트, fallback 클립보드 복사)
- [x] 등대 추천 질문 템플릿 UI (빈 화면에 4개 버튼, 탭하면 바로 검색)
- [x] 항해일지 탭 UI 정제: voyage만 표시, AI 인사이트·저장된 질문·위키 건강 체크·absorb 배너 숨김 (absorb는 백그라운드 자동 실행)
- [x] 홈 문구 커스터마이징 (설정탭 > 홈화면 구성, app_settings 저장)
- [x] Android 스플래시 iOS와 동일하게 설정
- [x] 백업 복원 후 태그 없는 기록 AI 재처리 큐 자동 등록 (backupService)
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

- [x] 태그 피커 UI — Bottom Sheet 모달로 교체, 카테고리 탭(치료/투약/신체·증상/행동·정서/기타/내태그), 부모-자식 자동 선택
- [x] 의료 타임라인 뷰 — TagsScreen에서 #의료 단독 선택 시 연도/월 그룹 타임라인 자동 전환 (FlatList 레코드 카드 대체)
- [ ] 버전 bump → TestFlight / Play Store 배포

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
