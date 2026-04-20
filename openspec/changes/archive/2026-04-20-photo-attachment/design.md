## Context

바다 앱은 음성/텍스트 기록만 지원하며 시각 정보를 담을 수 없다. Supabase Storage는 1단계(익명 인증)에서 이미 연결됐으므로 추가 인증 설정 없이 파일 업로드가 가능하다. records 테이블에 photo_url 컬럼을 추가해 기존 파이프라인과 통합한다.

## Goals / Non-Goals

**Goals:**
- 사진을 독립 기록으로 촬영·저장
- Supabase Storage에 업로드, URL을 records에 저장
- 촬영 후 말하기 / AI 자동 태깅 / 그냥 저장 3가지 선택
- 캘린더·태그 화면에서 사진 기록 썸네일 표시
- 등대 답변에서 사진 썸네일 갤러리 렌더링
- AI 자동 태깅 시 월 카운터 포함

**Non-Goals:**
- 갤러리에서 기존 사진 가져오기 (카메라 촬영만)
- 동영상 첨부
- 사진 편집
- 기존 텍스트/음성 기록에 사진 추가 (신규 독립 기록만)

## Decisions

### D1. 사진은 독립 기록 타입 (source='photo')
records 테이블에 `photo_url TEXT` 컬럼 추가. source 필드가 없으므로 photo_url IS NOT NULL로 사진 기록 구분. 기존 음성/텍스트 기록은 photo_url NULL.

### D2. Supabase Storage 버킷: `photos`
경로: `photos/{userId}/{recordId}.jpg`. RLS: 본인 userId 경로만 업로드/조회 허용. 가족방 멤버 공유는 2단계 DB 이전 시 처리.

### D3. 촬영 후 모달로 3가지 선택 제시
RecordingScreen과 별개로 HomeScreen에서 카메라 아이콘 탭 → 촬영 → PhotoActionModal 표시.
- **말하기**: 기존 RecordingScreen으로 이동 (photo_url 파라미터 전달)
- **AI 자동 태깅**: photoService.analyzeAndTag() → Gemini 이미지 분석
- **그냥 저장**: summary="" 빈 기록으로 저장, 날짜/아이 정보만

### D4. 등대 갤러리 응답: URL 목록 반환 후 프론트에서 렌더링
absorbService의 등대 질문 처리 시 photo_url이 있는 기록을 별도 추출. AI는 텍스트 컨텍스트만 처리하고, 응답 JSON에 `photo_urls: string[]` 필드 추가. AssistantBubble에서 PhotoGallery 컴포넌트로 렌더링. 이미지 자체를 Gemini에 넘기지 않아 토큰 추가 소모 없음.

### D5. AI 자동 태깅: Gemini에 이미지 URL 전달
Gemini 2.5 Flash Lite의 멀티모달 지원 활용. 이미지 URL + 태그 목록 프롬프트 → 적합한 태그 반환. 월 AI 카운터 1회 소모.

### D6. DB 마이그레이션 v17
records 테이블에 `photo_url TEXT` 컬럼 추가. 기존 레코드는 NULL.

## Risks / Trade-offs

- **오프라인 촬영**: Supabase Storage 업로드 실패 시 → 로컬 임시 저장 후 offlineQueue로 재시도
- **Storage 비용**: Supabase 무료 플랜 1GB. 사진 1장 평균 2MB 기준 약 500장. 초과 시 압축 or 유료 플랜 필요
- **가족 공유 미지원**: 현재 Storage RLS는 본인만 조회 가능. 가족방 공유는 2단계 이후 처리

## Open Questions

- Supabase 대시보드에서 `photos` 버킷이 이미 있는가? (확인 필요)
- 사진 압축 품질: 업로드 전 클라이언트에서 리사이즈 여부 (expo-image-manipulator 사용 고려)
