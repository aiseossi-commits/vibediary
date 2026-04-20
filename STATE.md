# STATE.md — 현재 작업 상태

> Claude Code 세션 간 코드 레벨 컨텍스트. 전략/제품 현황은 HQ.md 참조.

---

## 현재 위치

**마지막 커밋**: `chore: supabase-records-sync openspec 아카이브 + specs 동기화` (2026-04-21)

**현재 브랜치**: main

**미커밋**: 없음

**DB 현재 버전**: v17 (records.photo_url)

---

## 최근 완료된 작업

- [x] 팔레트 pearl 단일화: sage/emerald/amber/deepOcean/clearSky/slateNavy 제거, 기본값 pearl로 고정, 설정 색상 테마 선택 UI 완전 제거
- [x] 모아보기 "AI 인사이트 생성" 버튼 최상단으로 이동 + 문구 정리 (항해일지→AI 인사이트)
- [x] 캘린더 날짜 시트 풀스크린 + 카드 깊이감: SHEET_HEIGHT 60%→82%, 시트 배경 surface→background (카드가 배경 위로 뜨는 효과)
- [x] pearl 캘린더 density 채도 낮춤: lightDensity #CCFBF1~#0EA5A0 → #D9EEEC~#6BA5A2 (muted teal)
- [x] pearl 녹음 버튼 정제: 테두리 제거(transparent), 마이크 아이콘 teal 연하게(#A8C5C3)
- [x] pearl 녹음 버튼 순백 + 그림자 깊이감: micBg #F3F4F6→#FFFFFF, shadow y4/opacity0.12/radius8
- [x] 팔레트 gold → pearl(진주) 교체: 배경 완전 neutral(#F9FAFB/#0F1117), 카드 white/dark-surface, 포인트 teal(#0EA5A0) 단색 집중 — 퍼슬리 류 전문적 느낌 지향
- [x] AI 호출 월 10회 통합 카운터 (무료 제한): useAIUsage 훅, appSettingsDao 확장, 등대 질문·인사이트 생성 양쪽 적용
- [x] 모아보기 voyage/ 필터링 — 이정표 등 non-voyage 페이지 제외
- [x] 막대 차트 렌더링 (react-native-chart-kit): AI 인사이트 VISUAL_DATA 시각화
- [x] EventTrackerModal 시트 높이 92% (홈 증상·상태 추적)
- [x] AI 인사이트 배지 텍스트 가시성 개선 (teal bg + 흰 글씨)
- [x] 모아보기 인사이트·저장답변 카드 롱프레스 → 공유/삭제 액션시트 (인라인 버튼 제거)
- [x] AI 입력 모드 시간 파싱: "아침 7시" → 07:00, 시간 미명시 시 23:59 fallback
- [x] UI 빼기 리팩터 5패스 (아마추어 느낌 제거, Persly 류 차분한 밀도 지향): **Pass 1** RecordCard 4방향 border 제거 + padding 18→14 + radius 20→12, SearchScreen insightCard/logCard shadow 제거. **Pass 2** 전체 정적 카드 surface에서 SHADOW.sm 제거 (RecordDetailScreen 3곳, TagsScreen 3곳, SearchScreen 4곳, SettingsScreen 3곳) — 떠있는 요소(CalendarScreen 헤더, Bottom Sheet)·진주 버튼은 브랜드 포인트로 유지. **Pass 3** 카드 radius를 `BORDER_RADIUS.md`(=12)로 통일 (기존 14·20 산재). **Pass 4** SettingsScreen 화면모드 섹션 통합 — "바다/밤바다 토글" 카드 + "색상 테마 팔레트" 카드를 하나의 카드로 병합하고 sectionDivider로 구분(iOS 그룹드 리스트 느낌). `themeToggleRow`/`paletteCard` 폐기, `themeToggleInnerRow`/`sectionDivider`/`paletteSectionLabel` 추가. **Pass 5** Accent(primary) 과용 감사 — CTA/액티브 상태가 아닌 3곳만 textSecondary/textPrimary로 치환: SearchScreen `insightSectionToggle`(접기/펼치기 보조 액션), TagsScreen `timelineMonthLabel`(장식성 레이블), SettingsScreen `appName`(앱 정보 표지). 탭바/버튼/체크/북마크/녹음버튼은 그대로 유지 (기능 신호로 작동)
- [x] 홈 위젯 3종 개선: (A) "AI 입력 모드" 토글 추가 — OFF 시 진주 버튼 롱프레스 비활성, 탭으로 녹음 화면만 이동, 힌트 문구 동기화 "탭하여 녹음 화면 열기" / ON 시 기존 동작 유지. (B) 홈 피드를 `getAllRecords(10)` → `getRecordsByDate(today)`로 전환, 설정 라벨 "최근 기록" → "오늘 기록"으로 문구 동기화 (이전 기록은 캘린더·태그·검색에서 조회). (C) 등대 물어보기 답변 마크다운 렌더링 (buildChatMarkdownStyles: 16pt/24lh, heading·bold 강조). (D) 모아보기 인사이트·저장 답변 카드 preview에 stripMarkdown 적용 — collapsed일 때 ## ** - 등 원문 제거된 깔끔한 텍스트, expanded에선 기존 Markdown 렌더링
- [x] 등대 탭 UX 재구성 + 은유 일관성 유지: 탭 라벨 "등대/항해일지" → "물어보기/모아보기"로 변경 (앱 타이틀·답변 버블·빈상태 아이콘은 바다 은유 유지). 물어보기=채팅+추천질문만, 모아보기=AI인사이트+항해일지생성+저장답변 3섹션 통합. 기존 InsightSection + VoyageLogFeed 두 컴포넌트를 CollectionFeed로 병합 — 이전에 고아였던 voyage/* wiki 페이지도 인사이트 섹션에 노출됨 (필터 제거)
- [x] VISUAL_DATA 파싱·저장 버그 수정 (absorbService): (A) 메인 프롬프트의 visual_data 스키마 재명시 (emoji+label+count 세 필드만), 반환값이 객체든 문자열이든 normalizeVisualData로 JSON 문자열 정규화 후 DB 저장 (SQLite가 객체를 [object Object]로 저장하던 문제 해결). (B) fallback 프롬프트 재작성 — VISUAL_DATA 한 줄 JSON 강제, 스키마 명시, 3~6개 패턴 지시. (C) 파싱 로직을 extractVisualDataBlock로 대체 — balanced brace 추적으로 개행 포함 JSON도 추출, `---` 구분자 의존 제거. (D) CollectionFeed가 레거시 body에 VISUAL_DATA 원문이 남아있으면 렌더링 시점에 extractVisualDataBlock로 자동 정화 (DB 마이그레이션 없이 즉시 복구)
- [x] 항해일지 생성 버그 수정: 이전에는 generateVoyageReport가 voyage/* wiki에 저장해도 어느 화면에도 표시 안 되던 고아 상태. 이제 모아보기 탭의 AI 인사이트 섹션에 즉시 노출됨 + 생성 완료 후 loadAll()로 자동 새로고침
- [x] 로컬 android/를 EAS prebuild 산출물과 일치시킴: `expo prebuild --clean`으로 재생성 후 release signing config(upload-keystore.jks, build.gradle의 signingConfigs.release)만 수동 복원. 이제 `eas build --local`과 `eas build` 원격 결과가 동일한 splash 동작을 보임. generate-splash.js 삭제(텍스트 PNG는 RN SplashOverlay로 대체됨), AndroidManifest intent-filter도 prebuild가 scheme 속성 자동 추가(content/file)
- [x] app.json expo-splash-screen plugin 정식 등록: backgroundColor/image/imageWidth/resizeMode 지정 → EAS prebuild 시에도 Android 12+ Splash API 속성(windowSplashScreenBackground/AnimatedIcon/postSplashScreenTheme) 자동 설정됨. android.backgroundColor가 AppTheme.windowBackground로도 자동 반영(활동 배경색=splashscreen 배경색)되어 커스텀 plugin 불필요
- [x] Android 스플래시 깜빡임 수정: AppTheme windowBackground=#070D1A로 흰 플래시 제거, Android 12+ Splash Screen API 적용(배경+가운데 아이콘), RN SplashOverlay 도입(expo-splash-screen.preventAutoHideAsync + 최소 1.2초 + DB 로딩 완료 후 페이드아웃), splashscreen_icon.png 5종 추가
- [x] 홈 진주 버튼 UX 정제: 녹음 중에도 pulse 유지(빨간색 전환), recording 상태 버튼은 배경 대신 테두리 강조 + 22px 빨간 원형 점
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
- [x] AI 입력 모드 v2 — 요일·범위 파싱, 복수 아이 라우팅(이름→childId), 이벤트 자동 등록(발열/발작 등), "길게 눌러서 AI 입력" 힌트 레이블
- [x] 버전 1.0.4 빌드 — iOS TestFlight 제출, Android AAB versionCode 15 서명 키 수정(credentialsSource: local)
- [x] **서버화 1단계**: Supabase 익명 인증 + 초대코드 기반 가족방 구현
  - Anonymous Auth 활성화, families/family_members 테이블 + RLS 생성
  - `@supabase/supabase-js` + `expo-secure-store` 설치
  - `src/lib/supabase.ts`, `src/context/AuthContext.tsx`, `src/services/familyService.ts` 생성
  - `src/screens/FamilyShareScreen.tsx` 생성 (설정 > 가족 공유 진입)
- [x] **사진 첨부**: DB v17 photo_url, Supabase Storage 업로드, PhotoActionModal (말하기/AI자동태깅/그냥저장), 홈 카메라 버튼, RecordCard 썸네일, RecordDetailScreen 전체보기, 등대 갤러리 응답
  - ⚠️ Supabase 대시보드에서 수동 작업 필요: Storage > `photos` 버킷 생성 (public: false) + RLS 정책 설정
- [x] **서버화 2단계**: SQLite-first + Supabase mirror 동기화 + 가족 피드
  - `src/services/syncService.ts`: syncRecord / syncPendingRecords / runInitialMigration
  - recordPipeline / photoService 저장 후 fire-and-forget 동기화
  - AppNavigator 앱 시작 시 runInitialMigration (백그라운드)
  - `src/screens/FamilyFeedScreen.tsx`: 가족방 멤버 기록 피드 (Supabase 직접 조회, pull-to-refresh)
  - FamilyShareScreen "함께 보기" 버튼 → FamilyFeedScreen 이동
  - Supabase records 테이블 + RLS (본인 CRUD + 가족 SELECT) 생성 완료
- [ ] Android AAB versionCode 15 → Play Store 최종 제출

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
