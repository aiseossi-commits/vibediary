const path = require('path');
const sharpPath = '/Users/jhouse/.npm-global/lib/node_modules/openclaw/node_modules/sharp';
const sharp = require(sharpPath);

const WIDTH = 1024;
const HEIGHT = 500;

async function generate() {
  const bgPath = '/Users/jhouse/Desktop/Gemini_Generated_Image_8l5xj58l5xj58l5x.png';
  const outPath = path.join(__dirname, '../assets/play-featured-image.png');

  await sharp(bgPath)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'center' })
    .png()
    .toFile(outPath);

  console.log('Play Store 피처드 이미지 생성 완료:', outPath);
}

generate().catch(console.error);
