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
  // iOS — 풀스크린 텍스트 splash (LaunchScreen)
  const iosDir = path.join(__dirname, '../ios/VibeDiary/Images.xcassets/SplashScreenLegacy.imageset');
  const W = 1242, H = 2688;
  const buf3x = Buffer.from(makeSvg(W, H));
  await sharp(buf3x).png().toFile(path.join(iosDir, 'image@3x.png'));
  await sharp(buf3x).resize(828, 1792).png().toFile(path.join(iosDir, 'image@2x.png'));
  await sharp(buf3x).resize(414, 896).png().toFile(path.join(iosDir, 'image.png'));
  console.log('iOS 스플래시 생성 완료');

  // Android — Android 11 이하용 풀스크린 텍스트 splash (Theme.App.SplashScreen windowBackground fallback)
  const androidBase = path.join(__dirname, '../android/app/src/main/res');
  const densities = [
    { dir: 'drawable-mdpi',    w: 360,  h: 640,  iconPx: 240 },
    { dir: 'drawable-hdpi',    w: 540,  h: 960,  iconPx: 360 },
    { dir: 'drawable-xhdpi',   w: 720,  h: 1280, iconPx: 480 },
    { dir: 'drawable-xxhdpi',  w: 1080, h: 1920, iconPx: 720 },
    { dir: 'drawable-xxxhdpi', w: 1440, h: 2560, iconPx: 960 },
  ];
  for (const { dir, w, h } of densities) {
    const buf = Buffer.from(makeSvg(w, h));
    await sharp(buf).png().toFile(path.join(androidBase, dir, 'splashscreen_logo.png'));
    console.log(`Android ${dir} splashscreen_logo (${w}x${h}) 생성 완료`);
  }

  // Android 12+ Splash Screen API용 — 가운데 작은 아이콘 (windowSplashScreenAnimatedIcon)
  // 240dp 캔버스, 안쪽 192dp가 visible area (OS가 동그라미로 마스킹)
  const sourceIcon = path.join(__dirname, '../assets/splash-icon.png');
  for (const { dir, iconPx } of densities) {
    // 240dp 정사각 캔버스에 splash-icon을 192dp 영역으로 리사이즈해서 가운데 배치
    const innerPx = Math.round(iconPx * (192 / 240));
    const padding = Math.round((iconPx - innerPx) / 2);
    const resized = await sharp(sourceIcon).resize(innerPx, innerPx).png().toBuffer();
    await sharp({
      create: {
        width: iconPx,
        height: iconPx,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resized, top: padding, left: padding }])
      .png()
      .toFile(path.join(androidBase, dir, 'splashscreen_icon.png'));
    console.log(`Android ${dir} splashscreen_icon (${iconPx}x${iconPx}) 생성 완료`);
  }

  console.log('\n전체 스플래시 이미지 생성 완료');
}

generate().catch(console.error);
