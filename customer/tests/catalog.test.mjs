import test from 'node:test';
import assert from 'node:assert/strict';
import { projectCatalog, rankBoards, isWideSize, recommendedSetup } from '../catalog.mjs';

const source={success:true,brands:[{BrandID:'BR',Name:'Brand'}],products:[
  {ProductID:'B1',SportID:'SNB',CategoryID:'SNBBOARD',BrandID:'BR',Model:'Board',Active:true,Status:'Published',Ability:'Intermediate|Advanced',AbilityLevel:4,TerrainPark:5,Flex:'Soft-Medium',ShapeOrWidth:'True Twin',Profile:'Camber',Description:'Customer description',SellingTips:'internal secret',ImageURL:'https://example.com/board.jpg',Variants:[{VariantType:'Size',VariantValue:'158W'}],Recommendations:{Binding:{Recommended:'D1'},Boot:{Recommended:'X1'}}},
  {ProductID:'B2',SportID:'SNB',CategoryID:'SNBBOARD',BrandID:'BR',Model:'Review',Active:true,Status:'Needs Review'},
  {ProductID:'D1',SportID:'SNB',CategoryID:'SNBBIND',BrandID:'BR',Model:'Binding',Active:true,Status:'Published'},
  {ProductID:'X1',SportID:'SNB',CategoryID:'SNBBOOT',BrandID:'BR',Model:'Boot',Active:false,Status:'Needs Review'},
]};
test('projection excludes review rows, internal fields, and unpublished recommendations',()=>{
  const boards=projectCatalog(source);
  assert.equal(boards.length,1);
  assert.ok(!JSON.stringify(boards).includes('internal secret'));
  assert.equal(boards[0].recommendations.binding.recommended.id,'D1');
  assert.equal(boards[0].recommendations.boot.recommended,undefined);
  assert.deepEqual(boards[0].sizes,['158W']);
});
test('matching uses catalog attributes and filters by category',()=>{
  const boards=projectCatalog(source);
  const match=rankBoards(boards,{ability:'Intermediate',terrain:'Park',feel:'playful'})[0];
  assert.equal(match.eligible,true);
  assert.equal(match.reasons.length,3);
  assert.equal(isWideSize(boards[0].sizes[0]),true);
  assert.equal(rankBoards(boards,{ability:'Beginner',terrain:'Park'})[0].eligible,false);
  assert.equal(rankBoards([{...boards[0],gender:"Women's"}],{gender:"Men's"})[0].eligible,false);
  assert.equal(rankBoards([{...boards[0],gender:"Women's"}],{gender:'All Boards'})[0].eligible,true);
  assert.equal(rankBoards([{...boards[0],gender:'Youth'}],{gender:'All Boards'})[0].eligible,true);
  assert.equal(rankBoards([{...boards[0],gender:'Unisex'}],{gender:'All Boards'})[0].eligible,true);
});
test('Step On binding is withheld from a conventional boot pairing',()=>{
  const altered=structuredClone(source);
  altered.products[2].EntryStyle='Step On';
  altered.products[3].Active=true;
  altered.products[3].Status='Published';
  const setup=recommendedSetup(projectCatalog(altered)[0]);
  assert.equal(setup.needsReview,true);
  assert.equal(setup.binding,null);
  assert.equal(setup.boot,null);
  altered.products[3].Model='Step On Boot';
  assert.equal(recommendedSetup(projectCatalog(altered)[0]).needsReview,false);
});
test('setup tiers keep a Step On mismatch out of alternate choices',()=>{
  const board={recommendations:{binding:{recommended:{id:'B1',stepOn:false},upgrade:{id:'B2',stepOn:true}},boot:{recommended:{id:'S1',stepOn:false},upgrade:{id:'S2',stepOn:false}}}};
  assert.equal(recommendedSetup(board).needsReview,false);
  assert.equal(recommendedSetup(board,'upgrade').needsReview,true);
  assert.equal(recommendedSetup(board,'budget').binding,null);
});
const skiSource={success:true,brands:[{BrandID:'BR',Name:'Brand'}],products:[
  {ProductID:'K1',SportID:'SKI',CategoryID:'SKIS',BrandID:'BR',Model:'Ski',Active:true,Status:'Published',Gender:'Unisex',Ability:'Intermediate',ShapeOrWidth:88,Profile:'Rocker',Flex:'Medium',Variants:[{VariantType:'length',VariantValue:'169'},{VariantType:'length',VariantValue:'175'}],Recommendations:{Binding:{Recommended:'KD'},Boot:{Recommended:'KB'}}},
  {ProductID:'KD',SportID:'SKI',CategoryID:'SKIBIND',BrandID:'BR',Model:'Ski Binding',Active:true,Status:'Published',DINRange:'4-13'},
  {ProductID:'KB',SportID:'SKI',CategoryID:'SKIBOOT',BrandID:'BR',Model:'Ski Boot',Active:true,Status:'Published'},
  {ProductID:'SB',SportID:'SNB',CategoryID:'SNBBOOT',BrandID:'BR',Model:'Snowboard Boot',Active:true,Status:'Published'},
]};
test('ski products project alongside snowboards with ski-only pairings',()=>{
  const [ski]=projectCatalog(skiSource);
  assert.equal(ski.sport,'ski');
  assert.equal(ski.waist,88);
  assert.equal(ski.shape,'');
  assert.deepEqual(ski.sizes,['169','175']);
  assert.equal(ski.recommendations.binding.recommended.id,'KD');
  assert.equal(ski.recommendations.boot.recommended.id,'KB');
  assert.equal(ski.recommendations.binding.recommended.din,'4-13');
  const crossed=structuredClone(skiSource);
  crossed.products[0].Recommendations.Boot.Recommended='SB';
  assert.equal(projectCatalog(crossed)[0].recommendations.boot.recommended,undefined);
});
test('ski shortlist filters by ability and length from height',()=>{
  const [ski]=projectCatalog(skiSource);
  const fit=rankBoards([ski],{ability:'Intermediate',height:70,weight:180,gender:'All Boards'})[0];
  assert.equal(fit.eligible,true);
  assert.deepEqual(fit.sizing.best,['169','175']);
  assert.equal(rankBoards([ski],{ability:'Intermediate',height:58,weight:80,gender:'All Boards'})[0].eligible,false);
  assert.equal(rankBoards([ski],{ability:'Beginner',height:70,weight:180})[0].eligible,false);
});
test('an expert skier matches Advanced skis, but snowboard matching stays exact',()=>{
  const ski={sport:'ski',ability:['Advanced'],terrain:{},flex:'',gender:'Unisex',sizes:['180']};
  const expert=rankBoards([ski],{ability:'Expert',height:74,weight:200,gender:'All Boards'})[0];
  assert.equal(expert.eligible,true);
  assert.deepEqual(expert.reasons,['Great for advanced riders']);
  assert.equal(rankBoards([{...ski,sport:'snowboard'}],{ability:'Expert'})[0].eligible,false);
  assert.equal(rankBoards([{...ski,ability:['Intermediate']}],{ability:'Expert'})[0].eligible,false);
});
test('boot and binding specs project customer-safe fields only',()=>{
  const src=structuredClone(skiSource);
  Object.assign(src.products[1],{Description:'A binding.',Ability:'Intermediate|Advanced',Gender:'Unisex',DINRange:'3-11',BindingFlex:'3',Response:'Balanced',EntryStyle:'Traditional',
    Terrain:'All Mountain',TerrainPark:5,SellingTips:'internal tip',TalkingPoints:'internal talk',ComparisonNotes:'Choose this over that.',CommonQuestions:'internal q',CustomerProfile:'internal profile',
    Variants:[{VariantType:'Brake Width',VariantValue:'100'},{VariantType:'Brake Width',VariantValue:'90'}]});
  Object.assign(src.products[2],{Description:'A boot.',Gender:"Men's",BootFlexIndex:'90',LastWidth:'103',ClosureSystem:'Traditional Buckles'});
  const [ski]=projectCatalog(src);
  const bind=ski.recommendations.binding.recommended,boot=ski.recommendations.boot.recommended;
  assert.deepEqual(bind.brakeWidths,[90,100]);
  assert.equal(bind.din,'3-11');
  assert.equal(bind.flexScale,3);
  assert.deepEqual(bind.ability,['Intermediate','Advanced']);
  assert.equal(boot.flexIndex,90);
  assert.equal(boot.lastWidth,103);
  assert.equal(boot.closure,'Traditional Buckles');
  const text=JSON.stringify(ski.recommendations);
  for(const banned of ['internal','Choose this over that','Terrain','All Mountain'])assert.ok(!text.includes(banned),banned);
});
test('a DIN range that Sheets turned into a date is never projected',()=>{
  const src=structuredClone(skiSource);
  src.products[1].DINRange='2026-04-13';
  assert.equal(projectCatalog(src)[0].recommendations.binding.recommended.din,undefined);
});
