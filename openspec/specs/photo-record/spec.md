# photo-record

## Purpose

홈 화면에서 카메라로 사진을 촬영하고 Supabase Storage에 업로드하여 records 테이블에 독립 기록으로 저장한다. 사진 기록은 캘린더·태그·기록 상세 화면에서 썸네일로 표시된다.

---

## Requirements

### Requirement: 사진 촬영 및 독립 기록 저장
홈 화면에서 카메라 아이콘을 탭하면 사진을 촬영하고, 촬영된 사진은 Supabase Storage에 업로드되며 records 테이블에 독립 기록으로 저장되어야 한다(SHALL).

#### Scenario: 카메라 진입 및 촬영
- **WHEN** 사용자가 홈 화면의 카메라 아이콘을 탭할 때
- **THEN** 카메라가 열리고 사진 촬영 후 PhotoActionModal이 표시된다

#### Scenario: Supabase Storage 업로드
- **WHEN** 사진 촬영이 완료될 때
- **THEN** 사진을 `photos/{userId}/{recordId}.jpg` 경로로 Supabase Storage에 업로드하고 URL을 반환한다

#### Scenario: 그냥 저장 선택
- **WHEN** 사용자가 PhotoActionModal에서 "그냥 저장"을 선택할 때
- **THEN** photo_url과 날짜·아이 정보만 포함한 기록을 records에 저장하고 홈으로 복귀한다

#### Scenario: 오프라인 업로드 실패 처리
- **WHEN** 네트워크 없이 사진 저장을 시도할 때
- **THEN** 로컬에 임시 저장하고 offlineQueue에 등록하여 네트워크 복구 시 자동 업로드한다

---

### Requirement: 사진 기록 썸네일 표시
캘린더, 태그, 기록 상세 화면에서 사진 기록은 썸네일로 표시되어야 한다(SHALL).

#### Scenario: 캘린더 날짜 시트에서 사진 기록
- **WHEN** 사진이 포함된 날짜의 기록 목록을 열 때
- **THEN** 기록 카드에 사진 썸네일(60×60)이 표시된다

#### Scenario: 기록 상세 화면에서 사진 전체 보기
- **WHEN** 사용자가 사진 기록의 썸네일을 탭할 때
- **THEN** 전체 화면 이미지 뷰어가 열린다
