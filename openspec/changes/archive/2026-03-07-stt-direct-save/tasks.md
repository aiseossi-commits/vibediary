## 1. AppNavigator 수정

- [x] 1.1 handleRecordingComplete에서 runSTTOnly 후 빈 텍스트면 Alert 표시 후 return
- [x] 1.2 텍스트가 있으면 processFromText 호출 후 홈 화면 복귀
- [x] 1.3 STTReviewScreen Stack.Screen 라우트 제거

## 2. 검증

- [x] 2.1 녹음 완료 시 리뷰 화면 없이 홈으로 복귀 확인
- [x] 2.2 무음 시 Alert 표시 확인
