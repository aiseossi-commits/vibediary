#!/usr/bin/env node
// App icon generator: SVG → PNG for all required asset sizes
// Usage: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, '..', 'assets');

const svgMain   = fs.readFileSync(path.join(ASSETS, 'logo.svg'));
const svgFg     = fs.readFileSync(path.join(ASSETS, 'logo-android-fg.svg'));
const svgMono   = fs.readFileSync(path.join(ASSETS, 'logo-monochrome.svg'));

async function generate() {
  // icon.png — 1024x1024 (SVG 자체 배경 포함)
  await sharp(svgMain).resize(1024, 1024).png().toFile(path.join(ASSETS, 'icon.png'));
  console.log('✓ icon.png');

  // splash-icon.png — 1024x1024
  await sharp(svgMain).resize(1024, 1024).png().toFile(path.join(ASSETS, 'splash-icon.png'));
  console.log('✓ splash-icon.png');

  // favicon.png — 48x48
  await sharp(svgMain).resize(48, 48).png().toFile(path.join(ASSETS, 'favicon.png'));
  console.log('✓ favicon.png');

  // android-icon-foreground.png — 1024x1024 (transparent bg)
  // 새 SVG는 scale(0.78)로 safe zone 내장됨 — 추가 패딩 불필요
  await sharp(svgFg).resize(1024, 1024).png().toFile(path.join(ASSETS, 'android-icon-foreground.png'));
  console.log('✓ android-icon-foreground.png');

  // android-icon-monochrome.png — 432x432
  await sharp(svgMono).resize(432, 432).png().toFile(path.join(ASSETS, 'android-icon-monochrome.png'));
  console.log('✓ android-icon-monochrome.png');

  // Android res mipmap foreground webp — Gradle이 직접 사용하는 파일
  const ANDROID_RES = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
  const densities = [
    { dir: 'mipmap-mdpi',    size: 108 },
    { dir: 'mipmap-hdpi',    size: 162 },
    { dir: 'mipmap-xhdpi',   size: 216 },
    { dir: 'mipmap-xxhdpi',  size: 324 },
    { dir: 'mipmap-xxxhdpi', size: 432 },
  ];
  const fgPng = path.join(ASSETS, 'android-icon-foreground.png');
  for (const { dir, size } of densities) {
    await sharp(fgPng).resize(size, size).webp().toFile(path.join(ANDROID_RES, dir, 'ic_launcher_foreground.webp'));
    console.log(`✓ ${dir}/ic_launcher_foreground.webp`);
  }

  console.log('\nDone! All icons generated.');
}

generate().catch(err => { console.error(err); process.exit(1); });
