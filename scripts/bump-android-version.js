#!/usr/bin/env node
/**
 * Android versionCode를 app.json과 android/app/build.gradle 동시에 올립니다.
 * 사용법: node scripts/bump-android-version.js
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appJsonPath = path.join(root, 'app.json');
const buildGradlePath = path.join(root, 'android', 'app', 'build.gradle');

// app.json 읽기
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const currentCode = appJson.expo.android.versionCode;
const nextCode = currentCode + 1;

// app.json 업데이트
appJson.expo.android.versionCode = nextCode;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

// build.gradle 업데이트
let gradle = fs.readFileSync(buildGradlePath, 'utf8');
gradle = gradle.replace(/versionCode \d+/, `versionCode ${nextCode}`);
fs.writeFileSync(buildGradlePath, gradle);

console.log(`✅ Android versionCode: ${currentCode} → ${nextCode}`);
console.log(`   app.json: 완료`);
console.log(`   android/app/build.gradle: 완료`);
console.log(`\n다음 단계: cd android && ./gradlew bundleRelease`);
