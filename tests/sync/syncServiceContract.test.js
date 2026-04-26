const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('syncService defines the full family sync table set', () => {
  const source = read('src/services/syncService.ts');
  const expectedTables = [
    'children',
    'tags',
    'records',
    'active_events',
    'event_daily_logs',
    'event_name_presets',
    'hidden_default_event_names',
    'synthesis_articles',
    'wiki_pages',
    'search_logs',
  ];

  assert.match(source, /SYNC_TABLES/, 'syncService should define SYNC_TABLES');
  for (const table of expectedTables) {
    assert.match(source, new RegExp(`name:\\s*'${table}'`), `SYNC_TABLES should include ${table}`);
  }
});

test('syncService performs generic upload, download, and watermark reset', () => {
  const source = read('src/services/syncService.ts');

  assert.match(source, /syncTableUpload/, 'syncService should have a generic upload path');
  assert.match(source, /syncTableDownload/, 'syncService should have a generic download path');
  assert.match(source, /last_download_/, 'download should use per-table watermarks');
  assert.match(source, /clearAllDownloadWatermarks/, 'family join needs a watermark reset API');
  assert.match(source, /processPendingDeletes\(readiness\)/, 'generic sync should still process pending deletes');
});

test('syncService processes pending deletes before downloading remote rows', () => {
  const source = read('src/services/syncService.ts');
  const pendingDeleteIndex = source.indexOf('await processPendingDeletes(readiness)');
  const downloadLoopIndex = source.indexOf('const result = await syncTableDownload');

  assert.ok(pendingDeleteIndex > -1, 'syncService should process pending deletes');
  assert.ok(downloadLoopIndex > -1, 'syncService should download remote rows');
  assert.ok(
    pendingDeleteIndex < downloadLoopIndex,
    'pending deletes must run before download so deleted remote rows do not get resurrected locally'
  );
});

test('wakeSync queues overlapping sync requests instead of ignoring them', () => {
  const source = read('src/services/syncService.ts');

  assert.doesNotMatch(
    source,
    /already in flight, ignoring/,
    'wakeSync must not drop family_joined or record_changed requests while another sync is running'
  );
  assert.match(source, /pendingSyncWake/, 'wakeSync should remember overlapping wake requests');
  assert.match(source, /while\s*\(true\)/, 'wakeSync should drain queued sync wake requests');
});
