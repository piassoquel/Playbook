import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { attachSizeCharts, evaluateSizing } from '../sizing.mjs';

const charts=JSON.parse(await readFile(new URL('../size-charts.json',import.meta.url),'utf8'));
test('catalog charts cover 19 matching models and never invent unlisted variants',async()=>{
  const source=JSON.parse(await readFile(new URL('../data/catalog-preview.json',import.meta.url),'utf8'));
  const boards=attachSizeCharts(source.boards,charts);
  assert.equal(boards.filter(b=>b.sizeGuide).length,19);
  for(const board of boards)for(const size of Object.keys(board.sizeGuide?.sizes||{}))assert.ok(board.sizes.includes(size));
  assert.equal(boards.find(b=>b.id==='SNB0026').sizeGuide.sizes['162W'],undefined);
  assert.equal(boards.find(b=>b.id==='SNB0035').sizeGuide.sizes['135'],undefined);
});
test('model chart filters by rider weight and matching boot system',()=>{
  const board={sizes:['152','156','158','162W'],sizeGuide:charts.SNB0026};
  assert.deepEqual(evaluateSizing(board,{weight:175,bootSize:9,bootSystem:'men'}).best,['156','158']);
  assert.deepEqual(evaluateSizing(board,{weight:175,bootSize:11,bootSystem:'men'}).best,[]);
});
test('general guide is labeled and separate from model charts',()=>{
  const result=evaluateSizing({sizes:['142','149','156','162W'],sizeGuide:null},{weight:175,bootSize:9,bootSystem:'men'});
  assert.equal(result.kind,'general');
  assert.deepEqual(result.best,['156']);
});
