#!/bin/sh
set -e

echo "=== ci_post_clone.sh 시작 ==="

# Node.js 설치
echo "Node.js 설치 중..."
brew install node

# npm 의존성 설치
echo "npm install 실행 중..."
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

# CocoaPods 의존성 설치 (xcworkspace 생성)
echo "pod install 실행 중..."
cd ios
pod install

echo "=== ci_post_clone.sh 완료 ==="
