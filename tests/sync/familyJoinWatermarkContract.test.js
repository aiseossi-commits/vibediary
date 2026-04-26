const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('FamilyShareScreen clears download watermarks before family join/create wake sync', () => {
  const source = read('src/screens/FamilyShareScreen.tsx');

  assert.match(source, /clearAllDownloadWatermarks/, 'FamilyShareScreen should import/use watermark reset');
  assert.match(
    source,
    /await clearAllDownloadWatermarks\(\);\s*\n\s*await wakeSync\('family_created'\)/,
    'family creation should reset download watermarks before wakeSync'
  );
  assert.match(
    source,
    /await clearAllDownloadWatermarks\(\);\s*\n\s*await wakeSync\('family_joined'\)/,
    'family join should reset download watermarks before wakeSync'
  );
});

test('FamilyShareScreen refreshes children after family sync', () => {
  const source = read('src/screens/FamilyShareScreen.tsx');

  assert.match(source, /useChild/, 'FamilyShareScreen should read ChildContext refreshChildren');
  assert.match(source, /refreshChildren/, 'FamilyShareScreen should refresh children after family sync');
  assert.match(
    source,
    /await wakeSync\('family_joined'\);\s*\n\s*await refreshChildren\(\)/,
    'family join should await sync before refreshing children'
  );
});
