#!/usr/bin/env node
// App icon generator: SVG → PNG for all required asset sizes
// Usage: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');
const sharp = require('/Users/jhouse/.npm-global/lib/node_modules/openclaw/node_modules/sharp');

const ASSETS = path.join(__dirname, '..', 'assets');

const svgMain   = fs.readFileSync(path.join(ASSETS, 'logo.svg'));
const svgFg     = fs.readFileSync(path.join(ASSETS, 'logo-android-fg.svg'));
const svgMono   = fs.readFileSync(path.join(ASSETS, 'logo-monochrome.svg'));

async function generate() {
  // icon.png — 1024x1024
  await sharp(svgMain).resize(1024, 1024).png().toFile(path.join(ASSETS, 'icon.png'));
  console.log('✓ icon.png');

  // splash-icon.png — 1024x1024 (same design, splash bg set in app.json)
  await sharp(svgMain).resize(1024, 1024).png().toFile(path.join(ASSETS, 'splash-icon.png'));
  console.log('✓ splash-icon.png');

  // favicon.png — 48x48
  await sharp(svgMain).resize(48, 48).png().toFile(path.join(ASSETS, 'favicon.png'));
  console.log('✓ favicon.png');

  // android-icon-foreground.png — 1024x1024 (transparent bg)
  await sharp(svgFg).resize(1024, 1024).png().toFile(path.join(ASSETS, 'android-icon-foreground.png'));
  console.log('✓ android-icon-foreground.png');

  // android-icon-monochrome.png — 432x432
  await sharp(svgMono).resize(432, 432).png().toFile(path.join(ASSETS, 'android-icon-monochrome.png'));
  console.log('✓ android-icon-monochrome.png');

  console.log('\nDone! All icons generated.');
}

generate().catch(err => { console.error(err); process.exit(1); });
