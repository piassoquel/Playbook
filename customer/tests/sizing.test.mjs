import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { attachSizeCharts, evaluateSizing, brakeWidthFor } from '../sizing.mjs';

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
test('boot size 11.5 selects wide variants automatically when there is no per-size boot data',()=>{
  const board={sizes:['156','156W','159W'],sizeGuide:null,gender:"Men's"};
  assert.deepEqual(evaluateSizing(board,{weight:175,bootSize:9,bootSystem:'men'}).best,['156','156W','159W']);
  assert.deepEqual(evaluateSizing(board,{weight:175,bootSize:11,bootSystem:'men'}).best,['156','156W','159W']);
  assert.deepEqual(evaluateSizing(board,{weight:175,bootSize:11.5,bootSystem:'men'}).best,['156W','159W']);
});
test('published per-size boot data overrides the generic wide-boot preference',()=>{
  const board={sizes:['154','157','159W','162W'],sizeGuide:charts.SNB0030,gender:"Men's"};
  // Mountain Twin's own chart says a boot-11 rider still fits the regular
  // 157 (bootMax 11), so it should not be dropped just for lacking a "W".
  assert.deepEqual(evaluateSizing(board,{weight:175,bootSize:11,bootSystem:'men'}).best,['157','159W','162W']);
});
test('minimum-only charts also need a general length match',()=>{
  const board={sizes:['147','152','159W'],sizeGuide:{kind:'model',source:'https://example.com',sizes:{'147':{weightMin:100},'152':{weightMin:110},'159W':{weightMin:120}}},gender:"Men's"};
  const result=evaluateSizing(board,{weight:175,bootSize:9,bootSystem:'men'});
  assert.equal(result.minimumOnly,true);
  assert.deepEqual(result.best,['159W']);
});
test('a weight within 15lbs of a neighboring size offers it as an alternative',()=>{
  const board={sizes:['152','156','158','161W'],sizeGuide:charts.SNB0026,gender:"Men's"};
  const near=evaluateSizing(board,{weight:185,bootSize:10.5,bootSystem:'men'});
  assert.deepEqual(near.best,['161W']);
  assert.deepEqual(near.alternatives,[]);
  const board2={sizes:['154','157','159W','162W'],sizeGuide:charts.SNB0030,gender:"Men's"};
  const result=evaluateSizing(board2,{weight:185,bootSize:10.5,bootSystem:'men'});
  assert.deepEqual(result.best,['159W']);
  assert.deepEqual(result.alternatives,[{size:'157',direction:'down'}]);
});
test('a weight more than 15lbs outside a neighboring size is not offered',()=>{
  const board={sizes:['150','155','165'],gender:"Men's",sizeGuide:{kind:'model',bootSystem:'men',source:'https://example.com',sizes:{
    '150':{weightMin:100,weightMax:140,bootMin:6,bootMax:9},
    '155':{weightMin:130,weightMax:170,bootMin:8,bootMax:10},
    '165':{weightMin:200,weightMax:240,bootMin:9,bootMax:12}
  }}};
  const result=evaluateSizing(board,{weight:160,bootSize:9,bootSystem:'men'});
  assert.deepEqual(result.best,['155']);
  assert.deepEqual(result.alternatives,[]);
});
test('an alternative must still satisfy the boot fit constraint',()=>{
  const board={sizes:['150','155','160'],gender:"Men's",sizeGuide:{kind:'model',bootSystem:'men',source:'https://example.com',sizes:{
    '150':{weightMin:100,weightMax:140,bootMin:6,bootMax:9},
    '155':{weightMin:130,weightMax:170,bootMin:8,bootMax:10},
    '160':{weightMin:160,weightMax:200,bootMin:9,bootMax:12}
  }}};
  const result=evaluateSizing(board,{weight:158,bootSize:8,bootSystem:'men'});
  assert.deepEqual(result.best,['155']);
  assert.deepEqual(result.alternatives,[]);
});
test('ski length follows height and ability, with terrain and weight nudges',()=>{
  const ski={sport:'ski',sizes:['164','170','176','182','188']};
  const at=(a)=>evaluateSizing(ski,{height:70,weight:175,...a}).best;
  assert.deepEqual(at({ability:'Intermediate',terrain:'AllMountain'}),['170','176']);
  assert.deepEqual(at({ability:'Beginner'}),['164','170']);
  assert.deepEqual(at({ability:'Expert',terrain:'Powder'}),['182','188']);
  assert.deepEqual(evaluateSizing(ski,{height:70,weight:175,ability:'Intermediate',terrain:'Park'}).best,['164','170']);
  // a rider light for their height (BMI < 19) skis 3cm shorter
  assert.deepEqual(evaluateSizing(ski,{height:70,weight:120,ability:'Intermediate'}).best,['164','170']);
});
test('ski length offers adjacent lengths as alternatives and excludes far-off skis',()=>{
  const ski={sport:'ski',sizes:['164','170','176','182','188']};
  const result=evaluateSizing(ski,{height:70,weight:175,ability:'Intermediate'});
  assert.deepEqual(result.alternatives,[{size:'164',direction:'down'},{size:'182',direction:'up'}]);
  assert.deepEqual(evaluateSizing({sport:'ski',sizes:['110','120']},{height:70,weight:175,ability:'Advanced'}).best,[]);
  assert.equal(evaluateSizing(ski,{weight:175}).kind,'none');
  // with no length in the window, one up to 15cm short (or 10cm long) of the target still qualifies
  const pick=(sizes,a)=>evaluateSizing({sport:'ski',sizes},{height:70,weight:175,...a}).best;
  assert.deepEqual(pick(['172'],{ability:'Expert',terrain:'Powder'}),['172']);
  assert.deepEqual(pick(['165'],{ability:'Expert',terrain:'Powder'}),[]);
  assert.deepEqual(pick(['174'],{ability:'Beginner'}),['174']);
  assert.deepEqual(pick(['178'],{ability:'Beginner'}),[]);
});
test('ski target never runs more than 5cm past height, so tall riders still get the longest skis',()=>{
  const ski={sport:'ski',sizes:['174','182']};
  assert.deepEqual(evaluateSizing(ski,{height:74,weight:210,ability:'Expert',terrain:'Powder'}).best,['182']);
});
test('brake width is the narrowest that reaches the waist without passing it by more than 15mm',()=>{
  assert.equal(brakeWidthFor(97,[90,100]),100);
  assert.equal(brakeWidthFor(90,[90,100,115]),90);
  assert.equal(brakeWidthFor(84,[95,105]),95);
  assert.equal(brakeWidthFor(105,[90,100]),null);
  assert.equal(brakeWidthFor(90,[110,120]),null);
  assert.equal(brakeWidthFor(null,[90,100]),null);
  assert.equal(brakeWidthFor(97),null);
});
