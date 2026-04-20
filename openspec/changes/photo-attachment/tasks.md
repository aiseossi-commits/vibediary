## 1. Supabase Storage 설정

- [ ] 1.1 Supabase 대시보드 > Storage > `photos` 버킷 생성 (public: false)
- [ ] 1.2 Storage RLS 정책: `photos/{userId}/*` 경로는 본인만 업로드/조회 허용

## 2. DB 마이그레이션

- [x] 2.1 `src/db/schema.ts`에 `photo_url TEXT` 컬럼 추가 (records 테이블 v17 마이그레이션)
- [x] 2.2 `src/db/database.ts`에 v17 마이그레이션 실행 코드 추가

## 3. 패키지 설치

- [x] 3.1 `npx expo install expo-image-picker expo-image`

## 4. photoService 구현

- [x] 4.1 `src/services/photoService.ts` 생성
- [x] 4.2 `takePhoto()` — expo-image-picker로 카메라 실행, 촬영 결과 반환
- [x] 4.3 `uploadPhoto(uri, userId, recordId)` — Supabase Storage 업로드, URL 반환
- [x] 4.4 `savePhotoRecord(photoUrl, childId, tags?)` — records INSERT (photo_url + 날짜 + 아이)
- [x] 4.5 `analyzePhotoTags(photoUrl)` — Gemini 멀티모달 호출, 태그 배열 반환, AI 카운터 포함

## 5. PhotoActionModal 구현

- [x] 5.1 `src/components/PhotoActionModal.tsx` 생성
- [x] 5.2 말하기 버튼 — RecordingScreen으로 navigate (photoUrl 파라미터 전달)
- [x] 5.3 AI 자동 태깅 버튼 — analyzePhotoTags() 호출, 로딩 표시, 저장
- [x] 5.4 그냥 저장 버튼 — savePhotoRecord() 호출
- [x] 5.5 로딩/에러 상태 처리

## 6. 홈 화면 카메라 진입점 추가

- [x] 6.1 `src/screens/HomeScreen.tsx`에 카메라 아이콘 버튼 추가
- [x] 6.2 탭 시 takePhoto() → PhotoActionModal 표시

## 7. 사진 썸네일 표시

- [x] 7.1 `src/components/PhotoGallery.tsx` 생성 — URL 배열 받아 썸네일 그리드 렌더링
- [x] 7.2 `src/screens/RecordDetailScreen.tsx`에 photo_url 있으면 전체 이미지 표시
- [x] 7.3 `src/components/RecordCard.tsx` (또는 해당 카드 컴포넌트)에 photo_url 있으면 썸네일 표시

## 8. 등대 갤러리 응답 연동

- [x] 8.1 `src/services/searchPipeline.ts` 등대 질문 처리 시 photo_url 있는 기록 URL 목록 추출
- [x] 8.2 등대 응답 구조에 `photo_urls: string[]` 필드 추가
- [x] 8.3 `src/screens/SearchScreen.tsx` AssistantBubble에 photo_urls 있으면 PhotoGallery 렌더링

## 9. RecordingScreen에 photo_url 연동

- [x] 9.1 RecordingScreen이 photoUrl 파라미터 받으면 저장 시 photo_url 포함
- [x] 9.2 네비게이션 타입에 photoUrl 파라미터 추가

## 10. 마무리

- [x] 10.1 `npx tsc --noEmit` 타입 체크 통과
- [x] 10.2 STATE.md 업데이트
