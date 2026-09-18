import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { attachSizeCharts, evaluateSizing } from '../sizing.mjs';

const charts=JSON.parse(await readFile(new URL('../size-charts.json',import.meta.url),'utf8'));
test('catalog charts cover 22 matching models and never invent unlisted variants',async()=>{
  const source=JSON.parse(await readFile(new URL('../data/catalog-preview.json',import.meta.url),'utf8'));
  const boards=attachSizeCharts(source.boards,charts);
  assert.equal(boards.filter(b=>b.sizeGuide).length,22);
  for(const board of boards)for(const size of Object.keys(board.sizeGuide?.sizes||{}))assert.ok(board.sizes.includes(size));
  assert.deepEqual(boards.find(b=>b.id==='SNB0026').sizeGuide.sizes['161W'],{weightMin:160,weightMax:220,bootMin:10,bootMax:null,waistCm:26.2});
  assert.equal(boards.find(b=>b.id==='SNB0035').sizeGuide.sizes['135'],undefined);
  // DPR 147's published minimum (50) is 30lbs below the shop's reference chart minimum (80),
  // so its top end is the reference chart's top end shifted by that same offset, not used as-is.
  assert.deepEqual(boards.find(b=>b.id==='SNB0035').sizeGuide.sizes['147'],{weightMin:50,weightMax:115,waistCm:24.8});
  assert.deepEqual(boards.find(b=>b.id==='SNB0045').sizeGuide.sizes['162W'],{weightMin:154,weightMax:231});
});
test('model chart filters by rider weight and matching boot system',()=>{
  const board={sizes:['152','156','158','162W'],sizeGuide:charts.SNB0026};
  assert.deepEqual(evaluateSizing(board,{weight:175,bootSize:9,bootSystem:'men'}).best,['156','158']);
  assert.deepEqual(evaluateSizing(board,{weight:175,bootSize:11,bootSystem:'men'}).best,[]);
});
test('Mondo selection uses the board category for US chart comparison',()=>{
  const board={sizes:['152','156','158','162W'],sizeGuide:charts.SNB0026,gender:"Men's"};
  const us=evaluateSizing(board,{weight:175,bootSize:9,gender:"Men's",bootUnit:'us'}).best;
  const mondo=evaluateSizing(board,{weight:175,bootSize:27,gender:"Men's",bootUnit:'mondo'}).best;
  assert.deepEqual(mondo,us);
});
test('All Boards checks boot sizes against each board category',()=>{
  const board={gender:"Women's",sizes:['146'],sizeGuide:{kind:'model',bootSystem:'women',sizes:{'146':{weightMin:100,weightMax:180,bootMin:8,bootMax:9}}}};
  assert.deepEqual(evaluateSizing(board,{gender:'All Boards',weight:140,bootSize:8.5,bootUnit:'us'}).best,['146']);
  assert.deepEqual(evaluateSizing(board,{gender:'All Boards',weight:140,bootSize:10,bootUnit:'us'}).best,[]);
});
test('general guide is labeled and separate from model charts',()=>{
  const result=evaluateSizing({sizes:['142','149','156','162W'],sizeGuide:null},{weight:175,bootSize:9,bootSystem:'men'});
  assert.equal(result.kind,'general');
  assert.deepEqual(result.best,['156']);
});
test('boot size 11 selects wide variants automatically',()=>{
  const board={sizes:['156','156W','159W'],sizeGuide:null,gender:"Men's"};
  assert.deepEqual(evaluateSizing(board,{weight:175,bootSize:9,bootSystem:'men'}).best,['156','156W','159W']);
  assert.deepEqual(evaluateSizing(board,{weight:175,bootSize:11,bootSystem:'men'}).best,['156W','159W']);
});
test('minimum-only charts also need a general length match',()=>{
  const board={sizes:['147','152','159W'],sizeGuide:{kind:'model',source:'https://example.com',sizes:{'147':{weightMin:100},'152':{weightMin:110},'159W':{weightMin:120}}},gender:"Men's"};
  const result=evaluateSizing(board,{weight:175,bootSize:9,bootSystem:'men'});
  assert.equal(result.minimumOnly,true);
  assert.deepEqual(result.best,['159W']);
});
