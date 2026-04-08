#!/bin/sh
set -e
xcodebuild \
  -workspace ios/VibeDiary.xcworkspace \
  -scheme VibeDiary \
  -configuration Release \
  -sdk iphoneos \
  -archivePath ios/build/VibeDiary.xcarchive \
  archive \
  CODE_SIGN_STYLE=Manual \
  DEVELOPMENT_TEAM=RAF5X9QGY9 \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="VibeDiary Distribution" \
  2>&1 | tail -30
