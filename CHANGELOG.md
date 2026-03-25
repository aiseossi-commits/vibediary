# CHANGELOG

> 빌드별 변경사항 및 이슈 기록. 배포 후 반드시 업데이트.

---

## v1.0.0 (build 5) — 2026-03-24

### 수정
- **AI 무한로딩 근본 수정**: warmDeno `AbortSignal.timeout` → `AbortController` (iOS Hermes JS 엔진 호환성)
- AI 타임아웃 15초 → 25초 (Deno cold start + LTE 지연 커버)
- offlineQueue 지수 백오프 자동 재시도 (10s → 30s → 1m → 2m)
- offlineQueue 처리 완료 콜백 메커니즘 (`onQueueProcessed`)
- RecordDetailScreen aiPending 배너 자동 갱신

### 알려진 이슈
- 설정 화면 "처리하기" 버튼이 0건 완료 시 성공 메시지로 잘못 표시됨 (미수정)

---

## v1.0.0 (build 3) — 2026-03-22

### 변경
- aiseossi-knowledge 서브모듈 → 독립 클론으로 전환
- CLAUDE.md 공유 지식 참조 섹션 추가

---

## v1.0.0 (build 2) — 2026-03-20

### 신규 기능
- Pretendard 폰트 4종 적용
- RecordingScreen OrganicBlob 시각화 (Reanimated)
- 커스텀 태그 AI 자동 적용
- 항해일지 독립 탭 (VoyageLogScreen)
- SearchScreen 채팅 버블 UI (multi-turn 대화)
- CalendarScreen 날짜 카드 스와이프 애니메이션

### 수정
- 탭 바 height 고정값 제거 → paddingTop/Bottom (입력창 겹침 근본 수정)
- Android KeyboardAvoidingView behavior 수정
- OrganicBlob 스프링 튜닝 (Android 촐싹거림 완화)
- eas.json 하드코딩 시크릿 제거

### 알려진 이슈
- iOS warmDeno Hermes 호환성 버그 → build 5에서 수정

---

## v1.0.0 (build 1) — 2026-03-20

- 최초 TestFlight 제출 (제출 실패, build 2로 재시도)
