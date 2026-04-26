const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('delete paths enqueue pending_deletes with table_name and row_id, not legacy record_id', () => {
  const recordsDao = read('src/db/recordsDao.ts');
  const pendingDeletesDao = read('src/db/pendingDeletesDao.ts');

  assert.doesNotMatch(
    recordsDao,
    /pending_deletes\s*\(\s*record_id/,
    'recordsDao.deleteRecord must not insert into legacy pending_deletes(record_id)'
  );
  assert.match(
    recordsDao,
    /enqueuePendingDelete\('records',\s*id\)/,
    'recordsDao.deleteRecord should enqueue record deletes through the shared helper'
  );
  assert.match(
    pendingDeletesDao,
    /pending_deletes\s*\(\s*table_name\s*,\s*row_id\s*,\s*created_at\s*\)/,
    'pending delete helper should enqueue table_name + row_id deletes'
  );
});

test('v21 pending_deletes migration supports fresh and legacy local schemas', () => {
  const database = read('src/db/database.ts');

  assert.match(
    database,
    /PRAGMA table_info\(pending_deletes\)/,
    'v21 migration should inspect pending_deletes columns before copying data'
  );
  assert.match(
    database,
    /hasLegacyPendingDeleteRecordId/,
    'v21 migration should detect the old record_id based pending_deletes schema'
  );
  assert.match(
    database,
    /hasPendingDeleteRowId/,
    'v21 migration should detect the already-new row_id based pending_deletes schema'
  );
  assert.match(
    database,
    /DROP TABLE IF EXISTS pending_deletes_v21/,
    'v21 migration should recover from a previous partial failed pending_deletes migration'
  );
});

test('phase 3 synced-table DAO mutations mark local rows dirty', () => {
  const files = [
    'src/db/childrenDao.ts',
    'src/db/tagsDao.ts',
    'src/db/eventDao.ts',
    'src/db/searchLogsDao.ts',
    'src/db/wikiDao.ts',
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /is_synced/, `${file} should write dirty sync state`);
    assert.match(source, /updated_at/, `${file} should maintain updated_at`);
  }
});
