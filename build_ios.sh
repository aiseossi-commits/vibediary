#!/bin/sh
set -e

ARCHIVE_PATH=ios/build/VibeDiary.xcarchive
EXPORT_PATH=ios/build/VibeDiary-export

echo "▶ 1/2 Archive 빌드 중..."
xcodebuild \
  -workspace ios/VibeDiary.xcworkspace \
  -scheme VibeDiary \
  -configuration Release \
  -sdk iphoneos \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  CODE_SIGN_STYLE=Manual \
  DEVELOPMENT_TEAM=RAF5X9QGY9 \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="VibeDiary Distribution" \
  2>&1 | grep -E "error:|warning:|PhaseScript|Archive|FAILED|Succeed|▶"

echo "▶ 2/2 IPA 내보내는 중..."
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist ios/ExportOptions.plist \
  2>&1 | grep -E "error:|Export|IPA|FAILED|Succeed"

echo ""
echo "✓ 완료: $EXPORT_PATH/VibeDiary.ipa"
echo "→ Transporter 앱에서 해당 IPA를 TestFlight에 업로드하세요"
