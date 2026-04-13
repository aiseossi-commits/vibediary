#!/bin/sh
set -e

OUTPUT_DIR=android/build
OUTPUT_PATH=$OUTPUT_DIR/VibeDiary.apk

echo "▶ APK 로컬 빌드 중..."
eas build --platform android --profile preview-apk --local --output "$OUTPUT_PATH"

echo ""
echo "✓ 완료: $OUTPUT_PATH"
echo "→ 실기기에 adb install $OUTPUT_PATH 또는 파인더에서 파일 공유"
