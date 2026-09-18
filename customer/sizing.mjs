export const GENERAL_SOURCE='https://ca.jonessnowboards.com/pages/a-guide-on-how-to-find-your-perfect-snowboard-size';
const adult=[
  [75,100,137,143],[95,110,140,145],[105,120,142,147],[115,130,144,149],
  [125,140,146,151],[135,150,148,153],[145,160,150,155],[155,170,152,157],
  [165,180,154,159],[175,190,156,161],[185,200,158,163],[195,210,160,165],
  [205,220,162,167],[215,230,164,169],[225,999,165,999]
];
const youth=[
  [20,45,70,80],[25,52,80,90],[30,52,85,95],[33,52,90,100],
  [37,63,95,105],[44,70,100,109],[50,77,105,119],[57,83,110,125],
  [66,92,115,129],[77,103,125,135]
];
const minWaistMen={10:25.9,10.5:26.1,11:26.3,11.5:26.5,12:26.7,12.5:26.9,13:27.1,13.5:27.3,14:27.5,14.5:27.8};
function minWaist(boot,system){
  const men=system==='women'?boot-1.5:system==='men'?boot:null;
  if(men===null||men<10)return null;
  const size=Math.min(14.5,Math.floor(men*2)/2);
  return minWaistMen[size]||null;
}
export function attachSizeCharts(boards,charts){
  return boards.map(board=>{
    const chart=charts[board.id];
    const sizes=Object.fromEntries(Object.entries(chart?.sizes||{}).filter(([size])=>board.sizes.includes(size)));
    return {...board,sizeGuide:chart?.season===board.season&&Object.keys(sizes).length?{...chart,sizes}:null};
  });
}
export function evaluateSizing(board,answers={}){
  const weight=Number(answers.weight);
  const category=answers.gender==='All Boards'?board.gender:answers.gender;
  const system=category ? (category==="Women's"?'women':category==='Youth'?'kids':'men') : (answers.bootSystem||'men');
  // Burton's published snowboard-boot conversion chart maps adult Mondo to
  // US men's +18 and US women's +17 for the sizes used here.
  const rawBoot=Number(answers.bootSize);
  const boot=answers.bootUnit==='mondo' && system!=='kids' ? rawBoot-(system==='women'?17:18) : rawBoot;
  if(!weight||!board?.sizes?.length)return {kind:'none',best:[],possible:[],source:null,alternatives:[]};
  const chart=board.sizeGuide;
  if(chart?.kind==='model'){
    const possible=[],best=[];
    const minimumOnly=Object.values(chart.sizes).every(spec=>spec.weightMax==null);
    const systemMatches=Boolean(chart.bootSystem&&chart.bootSystem===system&&system!=='kids');
    for(const size of board.sizes){
      const spec=chart.sizes[size];if(!spec)continue;
      const weightFits=(spec.weightMin==null||weight>=spec.weightMin)&&(spec.weightMax==null||weight<=spec.weightMax);
      if(!weightFits)continue;
      possible.push(size);
      const bootFits=!systemMatches||!boot||((spec.bootMin==null||boot>=spec.bootMin)&&(spec.bootMax==null||boot<=spec.bootMax));
      const widthMin=!systemMatches&&spec.waistCm?minWaist(boot,system):null;
      if(bootFits&&(!widthMin||spec.waistCm>=widthMin))best.push(size);
    }
    // A minimum weight alone cannot choose a length. Intersect it with the
    // published general weight-to-length guide and keep the broader label.
    const lengthFits=minimumOnly ? generalSizes(board,weight) : null;
    const candidates=minimumOnly ? best.filter(size=>lengthFits.includes(size)) : best;
    // Real per-size manufacturer boot data (systemMatches) already decided
    // fit above; only fall back to the generic wide-boot preference when
    // there's no such data to trust.
    const bestSizes=systemMatches?candidates:preferWide(candidates,system==='kids'?0:boot);
    const alternatives=bestSizes.length?findAlternatives(board,chart,bestSizes,weight,boot,system,systemMatches):[];
    return {kind:'model',best:bestSizes,possible,source:chart.source,minimumOnly,bootChecked:systemMatches,alternatives};
  }
  const best=preferWide(generalSizes(board,weight),system==='kids'?0:boot);
  return {kind:'general',best,possible:best,source:GENERAL_SOURCE,bootChecked:false,alternatives:[]};
}
// A rider within this many pounds of a neighboring size's published range may
// reasonably choose it for a different ride feel, not just their exact match.
const ALT_TOLERANCE_LBS=15;
function findAlternatives(board,chart,bestSizes,weight,boot,system,systemMatches){
  const sortedCatalog=[...board.sizes].sort((a,b)=>parseFloat(a)-parseFloat(b));
  const sortedBest=[...bestSizes].sort((a,b)=>parseFloat(a)-parseFloat(b));
  const smallestIdx=sortedCatalog.indexOf(sortedBest[0]);
  const largestIdx=sortedCatalog.indexOf(sortedBest[sortedBest.length-1]);
  const boundBoot=system==='kids'?0:boot;
  const alternatives=[];
  const checkCandidate=(size,direction)=>{
    if(size==null||bestSizes.includes(size))return;
    const spec=chart.sizes[size];
    if(!spec)return;
    if(!systemMatches&&preferWide([size],boundBoot).length===0)return;
    const bootFits=!systemMatches||!boot||((spec.bootMin==null||boot>=spec.bootMin)&&(spec.bootMax==null||boot<=spec.bootMax));
    const widthMin=!systemMatches&&spec.waistCm?minWaist(boot,system):null;
    if(!bootFits||(widthMin&&spec.waistCm<widthMin))return;
    if(direction==='down'){
      if(spec.weightMax==null||weight<=spec.weightMax||weight>spec.weightMax+ALT_TOLERANCE_LBS)return;
    }else{
      if(spec.weightMin==null||weight>=spec.weightMin||weight<spec.weightMin-ALT_TOLERANCE_LBS)return;
    }
    alternatives.push({size,direction});
  };
  checkCandidate(sortedCatalog[smallestIdx-1],'down');
  checkCandidate(sortedCatalog[largestIdx+1],'up');
  return alternatives;
}
function generalSizes(board,weight){
  const rows=(board.gender==='Youth'?youth:adult).filter(([lo,hi])=>weight>=lo&&weight<=hi);
  if(!rows.length)return [];
  rows.sort((a,b)=>Math.abs((a[0]+a[1])/2-weight)-Math.abs((b[0]+b[1])/2-weight));
  const [,,min,max]=rows[0];
  return board.sizes.filter(s=>{const length=Number.parseInt(s,10);return length>=min&&length<=max;});
}
function preferWide(sizes,boot){
  if(boot<11.5)return sizes;
  const wide=sizes.filter(s=>/\d\s*w$/i.test(s)||/\bwide\b/i.test(s));
  return wide.length?wide:[];
}
