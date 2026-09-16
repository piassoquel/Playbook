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
test('matching uses catalog attributes and wide variants',()=>{
  const boards=projectCatalog(source);
  const match=rankBoards(boards,{ability:'Intermediate',terrain:'Park',feel:'playful',wide:true})[0];
  assert.equal(match.eligible,true);
  assert.equal(match.reasons.length,4);
  assert.equal(isWideSize(boards[0].sizes[0]),true);
  assert.equal(rankBoards(boards,{ability:'Beginner',terrain:'Park'})[0].eligible,false);
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
