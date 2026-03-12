const path = require('path');
const sharpPath = '/Users/jhouse/.npm-global/lib/node_modules/openclaw/node_modules/sharp';
const sharp = require(sharpPath);

const WIDTH = 1242;
const HEIGHT = 2688;

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#070D1A"/>
  <text
    x="${WIDTH / 2}"
    y="${HEIGHT / 2 - 60}"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    font-size="90"
    font-weight="600"
    fill="#F1F5F9"
    letter-spacing="-2"
  >기록에 치이지 말고,</text>
  <text
    x="${WIDTH / 2}"
    y="${HEIGHT / 2 + 80}"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    font-size="90"
    font-weight="600"
    fill="#F1F5F9"
    letter-spacing="-2"
  >그냥 말하세요</text>
</svg>
`;

async function generate() {
  const buf = Buffer.from(svg);
  const outDir = path.join(__dirname, '../ios/VibeDiary/Images.xcassets/SplashScreenLegacy.imageset');

  await sharp(buf).png().toFile(path.join(outDir, 'image@3x.png'));
  await sharp(buf).resize(828, 1792).png().toFile(path.join(outDir, 'image@2x.png'));
  await sharp(buf).resize(414, 896).png().toFile(path.join(outDir, 'image.png'));

  console.log('스플래시 이미지 생성 완료');
}

generate().catch(console.error);
