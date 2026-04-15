const path = require('path');
const sharpPath = '/Users/jhouse/.npm-global/lib/node_modules/openclaw/node_modules/sharp';
const sharp = require(sharpPath);

const BG = '#070D1A';
const TEXT = '#F1F5F9';

function makeSvg(width, height) {
  const fontSize = Math.round(width * 0.072);
  const lineGap = Math.round(fontSize * 1.6);
  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${BG}"/>
  <text
    x="${width / 2}"
    y="${height / 2 - lineGap / 2}"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    font-size="${fontSize}"
    font-weight="600"
    fill="${TEXT}"
    letter-spacing="-2"
  >기록에 치이지 말고,</text>
  <text
    x="${width / 2}"
    y="${height / 2 + lineGap / 2}"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    font-size="${fontSize}"
    font-weight="600"
    fill="${TEXT}"
    letter-spacing="-2"
  >그냥 말하세요</text>
</svg>
`;
}

async function generate() {
  // iOS
  const iosDir = path.join(__dirname, '../ios/VibeDiary/Images.xcassets/SplashScreenLegacy.imageset');
  const W = 1242, H = 2688;
  const buf3x = Buffer.from(makeSvg(W, H));
  await sharp(buf3x).png().toFile(path.join(iosDir, 'image@3x.png'));
  await sharp(buf3x).resize(828, 1792).png().toFile(path.join(iosDir, 'image@2x.png'));
  await sharp(buf3x).resize(414, 896).png().toFile(path.join(iosDir, 'image.png'));
  console.log('iOS 스플래시 생성 완료');

  // Android (각 density별 전체화면 이미지)
  const androidBase = path.join(__dirname, '../android/app/src/main/res');
  const densities = [
    { dir: 'drawable-mdpi',    w: 360,  h: 640  },
    { dir: 'drawable-hdpi',    w: 540,  h: 960  },
    { dir: 'drawable-xhdpi',   w: 720,  h: 1280 },
    { dir: 'drawable-xxhdpi',  w: 1080, h: 1920 },
    { dir: 'drawable-xxxhdpi', w: 1440, h: 2560 },
  ];
  for (const { dir, w, h } of densities) {
    const buf = Buffer.from(makeSvg(w, h));
    await sharp(buf).png().toFile(path.join(androidBase, dir, 'splashscreen_logo.png'));
    console.log(`Android ${dir} (${w}x${h}) 생성 완료`);
  }

  console.log('\n전체 스플래시 이미지 생성 완료');
}

generate().catch(console.error);
