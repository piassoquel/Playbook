import { rankBoards, terrainLabels, isWideSize, recommendedSetup } from './catalog.mjs';
const app=document.querySelector('#app');
const state={boards:[], answers:JSON.parse(sessionStorage.getItem('finderAnswers')||'null')||{sport:'snowboard',ability:'',terrain:'',feel:'',height:'',weight:'',bootSize:'',bootUnit:'us',gender:''},step:0,showAll:false,compare:[]};
state.answers.bootUnit ||= 'us';
state.answers.sport ||= 'snowboard';
if(state.answers.gender==='Unisex')state.answers.gender='All Boards';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>v?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v):'';
const photo=(p,cls='')=>p.image?`<img class="${cls}" src="${escape(p.image)}" alt="${escape(p.brand+' '+p.model)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createElement('span'))">`:`<div class="photo-fallback">PLAYBOOK<br><small>Image coming soon</small></div>`;
const VOCAB={snowboard:{one:'board',One:'Board',many:'boards',Many:'Boards',gear:'SNOWBOARD',these:'this board',find:'Find my board',href:'#/find'},ski:{one:'skis',One:'Skis',many:'skis',Many:'Skis',gear:'SKIS',these:'these skis',find:'Find my skis',href:'#/ski'}};
const currentSport=()=>state.answers.sport==='ski'?'ski':'snowboard';
const vocab=sport=>VOCAB[sport==='ski'?'ski':'snowboard'];
const sportOf=board=>board?.sport==='ski'?'ski':'snowboard';
const sizeLabel=(board,size)=>board.sport==='ski'?`${size} cm`:`${size}${isWideSize(size)?' · wide':''}`;
const specLine=b=>(b.sport==='ski'?[b.waist&&`${b.waist} mm waist`,b.profile,b.flex&&b.flex+' flex']:[b.shape,b.profile,b.flex&&b.flex+' flex']).filter(Boolean).join(' · ');
function beginJourney(sport){if(state.answers.sport!==sport){state.answers={sport,ability:'',terrain:'',feel:'',height:'',weight:'',bootSize:'',bootUnit:'us',gender:''};state.step=0;state.showAll=false;state.compare=[];save()}}
function getMySetup(){try{return JSON.parse(localStorage.getItem('mySetup')||'null')}catch{return null}}
function writeMySetup(next){if(!next.board&&!next.boot&&!next.binding){localStorage.removeItem('mySetup')}else{localStorage.setItem('mySetup',JSON.stringify({...next,savedAt:Date.now()}))}updateSetupBadge()}
function setupFor(sport){const saved=getMySetup();return saved&&(saved.sport||'snowboard')===sport?saved:null}
function toggleSetupPiece(kind,value,sport){const current=setupFor(sport)||{board:null,boot:null,binding:null};const isSame=kind==='board'?current.board?.boardId===value?.boardId:current[kind]?.id===value?.id;writeMySetup({...current,sport,[kind]:isSame?null:value})}
function saveFullSetup(board,tier,pair){writeMySetup({sport:sportOf(board),board:{boardId:board.id},boot:pair.boot?{...pair.boot,tier}:null,binding:pair.binding?{...pair.binding,tier}:null})}
function clearMySetup(){localStorage.removeItem('mySetup');updateSetupBadge()}
function updateSetupBadge(){const badge=document.querySelector('#setup-badge');if(!badge)return;const entry=getMySetup();const count=entry?[entry.board,entry.boot,entry.binding].filter(Boolean).length:0;badge.hidden=!count;if(count)badge.querySelector('#setup-badge-count').textContent=count}
function setupItemBlurb(type,tier,item,hasCompanion,sport){const these=vocab(sport).these;const tierText={recommended:`Our pick for ${these} — a solid balance of feel and value.`,upgrade:'A step up in performance for riders who want more from this setup.',budget:`A budget-friendly option that still pairs well with ${these}.`}[tier]||`Pairs well with ${these}.`;const matchText=hasCompanion?(type==='boot'?' Matched to the binding here to keep flex and response consistent.':' Matched to the boot here to keep flex and response consistent.'):'';const stepOnText=item.stepOn?' Step On compatible — clips in without straps for a faster entry.':'';return tierText+matchText+stepOnText}
function openSetupSheet(title,name,text){let sheet=document.querySelector('#setup-sheet');if(!sheet){sheet=document.createElement('dialog');sheet.id='setup-sheet';sheet.className='sheet';document.body.appendChild(sheet)}sheet.innerHTML=`<button type="button" class="sheet-close" aria-label="Close">×</button><p class="eyebrow">${escape(title)}</p><h3>${escape(name)}</h3><p>${escape(text)}</p>`;const close=()=>{sheet.classList.remove('open');setTimeout(()=>sheet.close(),200)};sheet.querySelector('.sheet-close').onclick=close;sheet.onclick=e=>{if(e.target===sheet)close()};sheet.showModal();requestAnimationFrame(()=>sheet.classList.add('open'))}
const stepsFor=sport=>[
  {key:'ability',title:'What’s your ability level?',subtitle:'',choices:[['Beginner','Getting comfortable'],['Intermediate','Confident on most runs'],['Advanced','Pushing into harder terrain'],['Expert','At home on demanding lines']]},
  {key:'terrain',title:'Where do you spend most days?',subtitle:'',choices:Object.entries(terrainLabels).map(([v,l])=>[v,l])},
  {key:'feel',title:'What kind of feel sounds right?',subtitle:'',choices:[['playful','Playful & forgiving'],['balanced','A bit of both'],['supportive','Supportive & precise']]},
  {key:'measurements',title:'Tell us about you.',subtitle:'',choices:[]},
  {key:'gender',title:`Let’s Filter Your ${vocab(sport).Many}`,subtitle:'',choices:[["Men's",'Men’s'],["Women's",'Women’s'],['Youth','Youth'],['All Boards',`All ${vocab(sport).Many}`]]},
];
async function load(){try{let boards;try{const cfg=await import('./firebase-config.js');if(!cfg.firebaseConfig?.projectId)throw Error('No Firebase project');const [{initializeApp},{getFirestore,collection,getDocs}]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')]);const db=getFirestore(initializeApp(cfg.firebaseConfig));boards=(await getDocs(collection(db,'customerBoards'))).docs.map(d=>d.data());}catch(e){if(location.hostname!=='localhost'&&location.hostname!=='127.0.0.1')throw e;const r=await fetch('./data/catalog-preview.json');if(!r.ok)throw Error('Preview catalog unavailable');boards=(await r.json()).boards;}state.boards=boards;route();}catch(e){app.innerHTML='<section class="empty"><h1>Catalog unavailable</h1><p>Please try again later.</p></section>';console.error(e)}}
function route(){window.scrollTo(0,0);const path=decodeURIComponent(location.hash.slice(1));document.querySelector('#compare-bar')?.remove();updateSetupBadge();if(path.startsWith('/board/'))return detail(path.slice(7));if(path.startsWith('/compare/'))return compare(path.slice(9).split(','));if(path==='/results')return results();if(path==='/setup')return setup();if(path==='/find'||path==='/snowboard'){beginJourney('snowboard');return question()}if(path==='/ski'){beginJourney('ski');return question()}home()}
function home(){app.innerHTML=`<section class="sport-home"><p class="eyebrow">Pro<span class="brand-fit">Fit</span></p><h1>Choose your<br><em>next ride.</em></h1><div class="sport-grid"><a class="sport-card snowboard" href="#/find"><img src="assets/snowboard-home.webp" alt="Snowboarder on snow"><span>SNOWBOARD</span><div><h2>Snowboard</h2><strong>Find my board</strong></div></a><a class="sport-card ski" href="#/ski"><img src="assets/ski-home.webp" alt="Skier on snow"><span>SKI</span><div><h2>Ski</h2><strong>Explore ski</strong></div></a></div></section>`}
function heightOptions(values,suffix,current){
  const hasValue=current!==''&&current!=null;
  return `<option value="" disabled ${!hasValue?'selected':''}>Select</option>${values.map(v=>`<option value="${v}" ${hasValue&&Number(current)===v?'selected':''}>${v} ${suffix}</option>`).join('')}`;
}
function sizeOptions(unit,selected){
  const values=unit==='mondo'?Array.from({length:35},(_,i)=>16+i*.5):Array.from({length:31},(_,i)=>1+i*.5);
  return values.map(value=>`<button class="size-option ${Number(selected)===value?'selected':''}" type="button" data-size="${value}" aria-pressed="${Number(selected)===value}">${value}</button>`).join('');
}
function positionSizePicker(form){
  const grid=form.querySelector('.size-options');
  const options=[...grid.querySelectorAll('[data-size]')];
  const target=options.findIndex(button=>Number(button.dataset.size)===Number(form.elements.bootSize.value))>=0
    ?Number(form.elements.bootSize.value)
    :state.answers.bootUnit==='mondo'?25:8;
  const el=options.find(button=>Number(button.dataset.size)===target);
  if(el)grid.scrollLeft=Math.max(0,el.offsetLeft-grid.clientWidth/2+el.clientWidth/2);
}
function question(){
  const steps=stepsFor(currentSport()),isSki=currentSport()==='ski';
  const s=steps[state.step];
  const intro=`<div class="progress"><span>QUESTION ${state.step+1} / ${steps.length}</span><span>${Math.round((state.step+1)/steps.length*100)}%</span></div><div class="progress-bar"><i style="width:${(state.step+1)/steps.length*100}%"></i></div><p class="eyebrow">LET'S FIND YOUR LINE</p><h1>${s.title}</h1>${s.subtitle?`<p class="muted">${s.subtitle}</p>`:''}`;
  const currentFeet=state.answers.height?Math.floor(state.answers.height/12):'';
  const currentInches=state.answers.height?state.answers.height%12:'';
  const measurements=`<form class="measurements" id="measurements"><label>Height <span>feet</span><select name="heightFeet" required>${heightOptions([3,4,5,6,7],'ft',currentFeet)}</select></label><label>Height <span>inches</span><select name="heightInches" required>${heightOptions([0,1,2,3,4,5,6,7,8,9,10,11],'in',currentInches)}</select></label><label>Weight <span>pounds</span><input name="weight" type="number" inputmode="numeric" min="20" max="400" step="1" required value="${escape(state.answers.weight||'')}"></label>${isSki?'':`<div class="boot-picker"><p>Snowboard boot size</p><div class="unit-toggle" role="group" aria-label="Boot size unit"><button type="button" data-unit="us" aria-pressed="${state.answers.bootUnit!=='mondo'}">US</button><button type="button" data-unit="mondo" aria-pressed="${state.answers.bootUnit==='mondo'}">Mondo</button></div><div class="size-options-wrap"><div class="size-options" role="group" aria-label="Choose your boot size">${sizeOptions(state.answers.bootUnit,state.answers.bootSize)}</div></div><p class="picker-hint">Swipe to see more sizes</p><p class="picker-error" hidden>Please choose your boot size.</p></div><input name="bootSize" type="hidden" value="${escape(state.answers.bootSize||'')}">`}<button class="button dark" type="submit">Continue</button></form>`;
  const choices=s.key==='measurements'?measurements:`<div class="choices">${s.choices.map(([v,l])=>`<button class="choice ${String(state.answers[s.key])===v?'selected':''}" data-value="${escape(v)}"><span>${escape(l)}</span></button>`).join('')}</div>`;
  app.innerHTML=`<section class="finder ${s.key==='measurements'?'finder-sticky':''}">${intro}${choices}<div class="finder-actions"><button class="text-button" id="back">${state.step?'Previous question':'Choose a sport'}</button></div></section>`;
  window.scrollTo(0,0);
  app.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{state.answers[s.key]=b.dataset.value;save();next()});
  const form=app.querySelector('#measurements');
  form?.querySelectorAll('[data-unit]').forEach(button=>button.onclick=()=>{state.answers.bootUnit=button.dataset.unit;state.answers.bootSize='';form.elements.bootSize.value='';form.querySelectorAll('[data-unit]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));form.querySelector('.size-options').innerHTML=sizeOptions(button.dataset.unit,'');form.querySelector('.picker-error').hidden=true;positionSizePicker(form);save()});
  form?.querySelector('.size-options')?.addEventListener('click',event=>{const button=event.target.closest('[data-size]');if(!button)return;form.elements.bootSize.value=button.dataset.size;state.answers.bootSize=Number(button.dataset.size);form.querySelectorAll('[data-size]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button))});form.querySelector('.picker-error').hidden=true;save()});
  form?.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;if(!isSki&&!form.elements.bootSize.value){form.querySelector('.picker-error').hidden=false;return}state.answers.height=Number(form.elements.heightFeet.value)*12+Number(form.elements.heightInches.value);state.answers.weight=Number(form.elements.weight.value);if(!isSki)state.answers.bootSize=Number(form.elements.bootSize.value);save();next()});
  if(form&&!isSki)positionSizePicker(form);
  app.querySelector('#back').onclick=()=>{if(state.step){state.step--;question()}else location.hash='/'};
}
function save(){sessionStorage.setItem('finderAnswers',JSON.stringify(state.answers))}
function updateCompareBar(){let bar=document.querySelector('#compare-bar');if(state.compare.length===2){if(!bar){bar=document.createElement('div');bar.id='compare-bar';bar.className='compare-bar';document.body.appendChild(bar)}bar.innerHTML=`<span>2 ${vocab(currentSport()).many} selected</span><a class="button dark" href="#/compare/${state.compare.map(encodeURIComponent).join(',')}">Compare them</a>`}else if(bar){bar.remove()}}

function next(){const steps=stepsFor(currentSport());if(state.step<steps.length-1){state.step++;question()}else location.hash='/results'}
function results(){
  const sport=currentSport(),V=vocab(sport);
  const ranked=rankBoards(state.boards.filter(b=>sportOf(b)===sport),state.answers);
  const visible=ranked.filter(x=>x.eligible&&x.score>0);
  const shown=state.showAll?visible:visible.slice(0,3);
  app.innerHTML=`<section class="results-head"><p class="eyebrow">YOUR SHORTLIST</p><h1>Your Perfect<br><em>${V.Many}.</em></h1><button class="why-trigger" id="why-results" type="button">Why these ${V.many}?</button><div class="result-tools"><span>${visible.length===1?`1 ${sport==='ski'?'pair of skis':'board'}`:`${visible.length} ${V.many}`} for you</span><a href="${V.href}" id="restart">Refine answers</a></div></section><section class="cards">${shown.map(({board:b,reasons},i)=>`<div class="card"><button type="button" class="compare-toggle" data-compare="${escape(b.id)}" aria-pressed="${state.compare.includes(b.id)}">${state.compare.includes(b.id)?'Comparing':'+ Compare'}</button><a class="card-tap" href="#/board/${encodeURIComponent(b.id)}"><div class="card-image">${photo(b)}<span class="card-number">${String(i+1).padStart(2,'0')}</span></div><div class="card-body"><p class="eyebrow">${escape(b.brand)}</p><h2>${escape(b.model)}</h2><p class="card-spec">${escape(specLine(b))}</p><div class="reasons">${reasons.map(r=>`<span>${escape(r)}</span>`).join('')}</div><div class="card-foot"><strong>${money(b.price)}</strong><span>View ${V.one}</span></div></div></a></div>`).join('')}</section>${visible.length>3&&!state.showAll?'<div class="more-wrap"><button class="button dark" id="show-more">Show me more</button></div>':''}${visible.length?'':'<section class="empty"><h2>No direct matches yet.</h2><p>Try another choice or ask us for a fit check.</p></section>'}<dialog class="why-dialog" id="why-dialog"><button type="button" id="close-why" aria-label="Close">×</button><p class="eyebrow">WHY THESE ${V.Many.toUpperCase()}?</p><h2>Picked for your ride.</h2><p>We use your riding answers, height, weight${sport==='ski'?'':', and boot size'} to find ${V.many} and listed ${sport==='ski'?'lengths':'sizes'} that may suit you. The first three are your strongest matches. We can help you check the final fit in store.</p></dialog>`;
  app.querySelector('#restart').onclick=()=>{state.step=0;state.showAll=false};
  app.querySelector('#show-more')?.addEventListener('click',()=>{state.showAll=true;results()});
  const dialog=app.querySelector('#why-dialog');app.querySelector('#why-results').onclick=()=>dialog.showModal();app.querySelector('#close-why').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close()};
  app.querySelectorAll('[data-compare]').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.compare;const idx=state.compare.indexOf(id);if(idx>-1){state.compare.splice(idx,1)}else{if(state.compare.length>=2)state.compare.shift();state.compare.push(id)}app.querySelectorAll('[data-compare]').forEach(b=>{const on=state.compare.includes(b.dataset.compare);b.setAttribute('aria-pressed',String(on));b.textContent=on?'Comparing':'+ Compare'});updateCompareBar()});
  updateCompareBar();
}
function setupTiers(board){
  return ['recommended','upgrade','budget'].filter(candidate=>{
    const pair=recommendedSetup(board,candidate);
    return !pair.needsReview&&(pair.binding||pair.boot);
  });
}
function setupCardsHTML(board,tier){
  const saved=getMySetup();
  const pair=recommendedSetup(board,tier);
  return ['binding','boot'].map(type=>{
    const item=pair[type];
    if(!item)return '';
    const isPieceSaved=saved?.[type]?.id===item.id;
    return `<article class="setup-item">${photo(item)}<div><p class="eyebrow">${type==='binding'?'BINDING':'BOOT'}</p><h3>${escape(item.brand)} ${escape(item.model)}</h3><p class="setup-item-price">${money(item.price)}</p><div class="setup-item-actions"><button type="button" class="setup-item-add ${isPieceSaved?'saved':''}" data-piece="${type}" data-piece-tier="${tier}">${isPieceSaved?'Added':'+ Add '+type}</button><button type="button" class="setup-item-info" data-info-type="${type}" data-info-tier="${tier}">Why this pick?</button></div></div></article>`;
  }).join('');
}
function fullSetupButtonHTML(board,tier){
  const pair=recommendedSetup(board,tier);
  if(!pair.boot&&!pair.binding)return '';
  const saved=getMySetup();
  const isBoardSaved=saved?.board?.boardId===board.id;
  const isFullSaved=isBoardSaved&&(!pair.boot||saved?.boot?.id===pair.boot.id)&&(!pair.binding||saved?.binding?.id===pair.binding.id);
  return `<button type="button" class="setup-add ${isFullSaved?'saved':''}" id="setup-add-full" data-tier="${tier}">${isFullSaved?'Full setup added':`Add ${vocab(sportOf(board)).one} + this setup`}</button>`;
}
function setupPanel(board,tier){
  const tiers=setupTiers(board);
  if(!tiers.length)return `<section class="setup setup-inline" id="setup-panel"><p class="eyebrow">COMPLETE THE RIDE</p><h2>Boots & bindings</h2><p>Ask us to help complete your setup.</p></section>`;
  const selected=tiers.includes(tier)?tier:tiers[0];
  return `<section class="setup setup-inline" id="setup-panel"><div class="setup-heading"><div><p class="eyebrow">COMPLETE THE RIDE</p><h2>Boots & bindings</h2></div></div>${tiers.length>1?`<div class="setup-tabs" role="tablist" aria-label="Setup options">${tiers.map(candidate=>`<button type="button" role="tab" data-tier="${candidate}" aria-selected="${candidate===selected}">${candidate==='recommended'?'Our pick':candidate==='budget'?'Budget':'Upgrade'}</button>`).join('')}</div>`:''}<div class="setup-grid-wrap"><div class="setup-grid" id="setup-grid">${setupCardsHTML(board,selected)}</div></div><p class="setup-note">Add a piece on its own, or the whole setup at once.</p><span id="setup-add-full-wrap"></span></section>`;
}
function detail(id){
  const board=state.boards.find(item=>item.id===id);
  if(!board){app.innerHTML='<section class="empty"><h1>Board unavailable</h1><a href="#/results">Back to results</a></section>';return}
  const images=board.images?.length?board.images:[{url:board.image,alt:board.model}];
  const rank=rankBoards([board],state.answers)[0];
  const sport=sportOf(board),V=vocab(sport);
  const sizes=rank.sizing.best.map(size=>`<span class="size-match">${escape(sizeLabel(board,size))}</span>`).join('');
  const altSizes=rank.sizing.alternatives.map(alt=>`<button type="button" class="size-alt" data-alt-size="${escape(sizeLabel(board,alt.size))}" data-alt-direction="${alt.direction}">${escape(sizeLabel(board,alt.size))}</button>`).join('');
  const isBoardSaved=getMySetup()?.board?.boardId===board.id;
  app.innerHTML=`<div class="detail-back"><a href="#/results">Back to results</a></div><article class="detail"><header class="detail-heading"><div><p class="eyebrow">${escape(board.brand)}</p><h1>${escape(board.model)}</h1></div><div class="detail-actions"><strong class="detail-price">${money(board.price)}</strong><button type="button" class="board-add ${isBoardSaved?'saved':''}" id="board-add">${isBoardSaved?`${V.One} added`:`+ Add ${V.one} to my setup`}</button><button type="button" class="setup-jump" id="setup-jump">See setup</button></div></header><div class="detail-media">${photo({brand:board.brand,model:board.model,image:images[0]?.url})}${images.length>1?`<div class="thumbs">${images.map((image,index)=>`<button data-img="${escape(image.url)}" aria-label="Show image ${index+1}"><img src="${escape(image.url)}" alt=""></button>`).join('')}</div>`:''}</div><div class="detail-info"><p class="description">${escape(board.description||'More details coming soon.')}</p><section class="sizes"><h2>${sport==='ski'?'My Length':'My Size'}</h2>${sizes?`<div class="size-list">${sizes}${altSizes}</div><p class="fine">${rank.sizing.best.length>1?`More than one ${sport==='ski'?'length':'size'} may work for you. `:''}${sport==='ski'?'Ski length is a starting point — we’ll confirm it with you in store.':'Try your size with boots and bindings for the final fit.'}${altSizes?` Dashed ${sport==='ski'?'lengths':'sizes'} are alternatives — tap one to see why.`:''}</p>`:`<p>We can help you check the best ${sport==='ski'?'length':'size'} in store.</p>`}</section>${rank.reasons.length?`<div class="why"><h2>Why it fits your ride</h2>${rank.reasons.map(reason=>`<p>${escape(reason)}</p>`).join('')}</div>`:''}<dl class="specs">${(sport==='ski'?[['Waist',board.waist&&`${board.waist} mm`],['Profile',board.profile],['Flex',board.flex]]:[['Shape',board.shape],['Profile',board.profile],['Flex',board.flex]]).filter(([,value])=>value).map(([label,value])=>`<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>${setupPanel(board,'recommended')}</div></article>`;
  window.scrollTo(0,0);
  app.querySelectorAll('[data-img]').forEach(button=>button.onclick=()=>{app.querySelector('.detail-media > img').src=button.dataset.img});
  app.querySelector('#setup-jump').onclick=()=>app.querySelector('.setup-inline').scrollIntoView({behavior:'smooth',block:'start'});
  app.querySelectorAll('[data-alt-size]').forEach(button=>button.onclick=()=>{
    const text=button.dataset.altDirection==='up'
      ?(sport==='ski'?'A longer ski can add stability at speed and float in soft snow, at the cost of a little quickness.':'Sizing up can add float in powder and more stability at speed, at the cost of a little quickness.')
      :(sport==='ski'?'A shorter ski can feel lighter and quicker to turn, at the cost of a little stability and float.':'Sizing down can make the board lighter and quicker to turn, at the cost of a little float and stability.');
    openSetupSheet(sport==='ski'?'ALTERNATIVE LENGTH':'ALTERNATIVE SIZE',button.dataset.altSize,text);
  });
  function refreshBoardAddButton(){
    const btn=app.querySelector('#board-add');
    if(!btn)return;
    const isSaved=getMySetup()?.board?.boardId===board.id;
    btn.classList.toggle('saved',isSaved);
    btn.textContent=isSaved?`${V.One} added`:`+ Add ${V.one} to my setup`;
  }
  let panelTransitioning=false;
  let currentSetupTier=setupTiers(board)[0];
  function refreshFullSetupButton(tier){
    const wrap=app.querySelector('#setup-add-full-wrap');
    if(!wrap)return;
    wrap.innerHTML=fullSetupButtonHTML(board,tier);
    const btn=wrap.querySelector('#setup-add-full');
    if(btn)btn.onclick=()=>{
      saveFullSetup(board,tier,recommendedSetup(board,tier));
      refreshFullSetupButton(tier);
      refreshCurrentCards(tier);
      refreshBoardAddButton();
    };
  }
  function refreshCurrentCards(tier){
    const grid=app.querySelector('#setup-grid');
    if(!grid)return;
    grid.innerHTML=setupCardsHTML(board,tier);
    bindCardButtons(tier);
  }
  function bindCardButtons(tier){
    app.querySelectorAll('[data-piece]').forEach(button=>button.onclick=()=>{
      const type=button.dataset.piece;
      const item=recommendedSetup(board,tier)[type];
      if(!item)return;
      toggleSetupPiece(type,{...item,tier},sport);
      refreshCurrentCards(tier);
    });
    app.querySelectorAll('[data-info-type]').forEach(button=>button.onclick=()=>{
      const type=button.dataset.infoType;
      const item=recommendedSetup(board,tier)[type];
      if(!item)return;
      const companion=recommendedSetup(board,tier)[type==='boot'?'binding':'boot'];
      openSetupSheet(type==='boot'?'BOOT':'BINDING',`${item.brand} ${item.model}`,setupItemBlurb(type,tier,item,Boolean(companion),sportOf(board)));
    });
  }
  const slideEasing='transform .22s cubic-bezier(.22,.68,.31,1)';
  function finishSlide(wrap,outEl,inEl,newTier){
    outEl.remove();
    inEl.id='setup-grid';
    inEl.style.position='';inEl.style.top='';inEl.style.left='';inEl.style.width='';
    inEl.style.transition='';inEl.style.transform='';
    wrap.style.height='';
    currentSetupTier=newTier;
    app.querySelectorAll('[role="tab"][data-tier]').forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.tier===newTier)));
    refreshFullSetupButton(newTier);
    bindCardButtons(newTier);
    panelTransitioning=false;
  }
  function cancelSlide(wrap,outEl,inEl){
    if(inEl)inEl.remove();
    outEl.style.position='';outEl.style.top='';outEl.style.left='';outEl.style.width='';
    outEl.style.transition='';outEl.style.transform='';
    wrap.style.height='';
    panelTransitioning=false;
  }
  function slideToTierByTap(newTier,direction){
    if(panelTransitioning||newTier===currentSetupTier)return;
    const wrap=app.querySelector('.setup-grid-wrap');
    const outEl=app.querySelector('#setup-grid');
    if(!wrap||!outEl)return;
    panelTransitioning=true;
    const width=wrap.clientWidth;
    const sign=direction==='left'?1:-1;
    wrap.style.height=wrap.offsetHeight+'px';
    outEl.style.position='absolute';outEl.style.top='0';outEl.style.left='0';outEl.style.width='100%';
    const inEl=document.createElement('div');
    inEl.className='setup-grid';
    inEl.innerHTML=setupCardsHTML(board,newTier);
    inEl.style.position='absolute';inEl.style.top='0';inEl.style.left='0';inEl.style.width='100%';
    inEl.style.transform=`translateX(${sign*width}px)`;
    wrap.appendChild(inEl);
    void inEl.offsetWidth;
    outEl.style.transition=inEl.style.transition=slideEasing;
    requestAnimationFrame(()=>{
      outEl.style.transform=`translateX(${-sign*width}px)`;
      inEl.style.transform='translateX(0px)';
    });
    setTimeout(()=>finishSlide(wrap,outEl,inEl,newTier),230);
  }
  function bindCardDrag(wrap){
    let sx=0,sy=0,axis=null,width=0,outEl=null,inEl=null,dir=null;
    wrap.addEventListener('touchstart',e=>{
      if(panelTransitioning)return;
      const t=e.touches[0];sx=t.clientX;sy=t.clientY;
      axis=null;inEl=null;dir=null;
      width=wrap.clientWidth;
      outEl=app.querySelector('#setup-grid');
    },{passive:true});
    wrap.addEventListener('touchmove',e=>{
      if(panelTransitioning||!outEl)return;
      const t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;
      if(axis===null&&(Math.abs(dx)>10||Math.abs(dy)>10))axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
      if(axis!=='x')return;
      e.preventDefault();
      const wantDir=dx<0?'left':'right';
      if(dir!==wantDir){
        if(inEl)inEl.remove();
        const tabs=[...app.querySelectorAll('[role="tab"][data-tier]')];
        const currentIndex=tabs.findIndex(tab=>tab.getAttribute('aria-selected')==='true');
        const nextIndex=wantDir==='left'?currentIndex+1:currentIndex-1;
        dir=wantDir;
        if(nextIndex<0||nextIndex>=tabs.length){
          inEl=null;
        }else{
          const sign=dir==='left'?1:-1;
          wrap.style.height=wrap.offsetHeight+'px';
          outEl.style.position='absolute';outEl.style.top='0';outEl.style.left='0';outEl.style.width='100%';
          inEl=document.createElement('div');
          inEl.className='setup-grid';
          inEl.dataset.tier=tabs[nextIndex].dataset.tier;
          inEl.innerHTML=setupCardsHTML(board,tabs[nextIndex].dataset.tier);
          inEl.style.position='absolute';inEl.style.top='0';inEl.style.left='0';inEl.style.width='100%';
          inEl.style.transform=`translateX(${sign*width}px)`;
          wrap.appendChild(inEl);
        }
      }
      if(!inEl){
        outEl.style.transform=`translateX(${dx*0.2}px)`;
        return;
      }
      const clamped=Math.max(-width,Math.min(width,dx));
      const sign=dir==='left'?1:-1;
      outEl.style.transform=`translateX(${clamped}px)`;
      inEl.style.transform=`translateX(${sign*width+clamped}px)`;
    },{passive:false});
    wrap.addEventListener('touchend',e=>{
      if(axis!=='x'||!outEl)return;
      const dx=e.changedTouches[0].clientX-sx;
      if(!inEl){
        outEl.style.transition=slideEasing;
        requestAnimationFrame(()=>{outEl.style.transform='translateX(0px)'});
        setTimeout(()=>{outEl.style.transition='';outEl.style.transform=''},230);
        return;
      }
      const commit=Math.abs(dx)>width*0.3;
      panelTransitioning=true;
      const sign=dir==='left'?1:-1;
      outEl.style.transition=inEl.style.transition=slideEasing;
      if(commit){
        const newTier=inEl.dataset.tier;
        requestAnimationFrame(()=>{
          outEl.style.transform=`translateX(${-sign*width}px)`;
          inEl.style.transform='translateX(0px)';
        });
        setTimeout(()=>finishSlide(wrap,outEl,inEl,newTier),230);
      }else{
        requestAnimationFrame(()=>{
          outEl.style.transform='translateX(0px)';
          inEl.style.transform=`translateX(${sign*width}px)`;
        });
        setTimeout(()=>cancelSlide(wrap,outEl,inEl),230);
      }
    });
  }
  function bindSetupShell(){
    const tabEls=[...app.querySelectorAll('[role="tab"][data-tier]')];
    tabEls.forEach((button,index)=>button.onclick=()=>{
      const currentIndex=tabEls.findIndex(b=>b.getAttribute('aria-selected')==='true');
      if(index===currentIndex)return;
      slideToTierByTap(button.dataset.tier,index>currentIndex?'left':'right');
    });
    const wrap=app.querySelector('.setup-grid-wrap');
    if(wrap&&tabEls.length>1)bindCardDrag(wrap);
    if(currentSetupTier){
      bindCardButtons(currentSetupTier);
      refreshFullSetupButton(currentSetupTier);
    }
  }
  bindSetupShell();
  app.querySelector('#board-add').onclick=()=>{toggleSetupPiece('board',{boardId:board.id},sport);refreshBoardAddButton()};
}
function compare(ids){
  const boards=[...new Set(ids)].map(id=>state.boards.find(b=>b.id===id)).filter(Boolean);
  if(boards.length<2){
    const V=vocab(currentSport());app.innerHTML=`<section class="empty"><h1>Choose two ${V.many} to compare</h1><p>Head back to your shortlist and tap “+ Compare” on two ${V.many}.</p><a href="#/results">Back to results</a></section>`;
    return;
  }
  const ranked=boards.map(board=>rankBoards([board],state.answers)[0]);
  const topScore=Math.max(...ranked.map(r=>r.score));
  const tiedForTop=ranked.filter(r=>r.score===topScore).length>1;
  const rows=[
    {label:'Price',cell:b=>money(b.price)},
    {label:boards[0].sport==='ski'?'Waist':'Shape',cell:b=>b.sport==='ski'?(b.waist?`${b.waist} mm`:'—'):b.shape||'—'},
    {label:'Profile',cell:b=>b.profile||'—'},
    {label:'Flex',cell:b=>b.flex||'—'},
    {label:'Good for',cell:b=>b.ability.join(', ')||'—'},
    {label:boards[0].sport==='ski'?'My length':'My size',cell:(b,i)=>ranked[i].sizing.best.length?ranked[i].sizing.best.map(size=>sizeLabel(b,size)).join(' or '):'Ask in store'},
    {label:'Why it fits',cell:(b,i)=>ranked[i].reasons.length?ranked[i].reasons.map(r=>`<span>${escape(r)}</span>`).join(''):'—',tags:true},
  ];
  app.innerHTML=`<div class="detail-back"><a href="#/results">Back to results</a></div><section class="compare"><p class="eyebrow">COMPARE</p><h1>Side by<br><em>side.</em></h1><div class="compare-heads">${boards.map((b,i)=>`<div class="compare-head">${ranked[i].score===topScore&&topScore>0&&!tiedForTop?'<span class="compare-best">Closer match</span>':''}${photo(b)}<p class="eyebrow">${escape(b.brand)}</p><h2>${escape(b.model)}</h2></div>`).join('')}</div><div class="compare-rows">${rows.map(row=>`<div class="compare-row"><p class="compare-row-label">${row.label}</p><div class="compare-row-values">${boards.map((b,i)=>`<div class="compare-cell ${row.tags?'compare-cell-tags':''}">${row.cell(b,i)}</div>`).join('')}</div></div>`).join('')}</div><div class="compare-actions">${boards.map(b=>`<div class="compare-action-col"><a class="button dark" href="#/board/${encodeURIComponent(b.id)}">View ${vocab(sportOf(b)).one}</a><button type="button" class="text-button compare-add" data-compare-add="${escape(b.id)}">Add to my setup</button></div>`).join('')}</div></section>`;
  window.scrollTo(0,0);
  app.querySelectorAll('[data-compare-add]').forEach(btn=>btn.onclick=()=>{const board=state.boards.find(b=>b.id===btn.dataset.compareAdd);if(!board)return;saveFullSetup(board,'recommended',recommendedSetup(board,'recommended'));location.hash='/setup'});
}
function setup(){
  const entry=getMySetup();
  const board=entry?.board?state.boards.find(b=>b.id===entry.board.boardId):null;
  const pieces=[];
  if(board){
    const rank=rankBoards([board],state.answers)[0];
    pieces.push({kind:'board',label:vocab(sportOf(board)).gear,item:board,extra:rank.sizing.best.length?`Recommended ${sportOf(board)==='ski'?'length':'size'}: ${rank.sizing.best.map(size=>sizeLabel(board,size)).join(' or ')}`:null});
  }
  if(entry?.boot)pieces.push({kind:'boot',label:'BOOT',item:entry.boot,tier:entry.boot.tier});
  if(entry?.binding)pieces.push({kind:'binding',label:'BINDING',item:entry.binding,tier:entry.binding.tier});
  if(!pieces.length){
    app.innerHTML=`<section class="empty"><h1>No setup saved yet</h1><p>Find a board or skis, boots, or bindings you like and add them to your setup to show an associate.</p><a class="button dark" href="#/find">Find my board</a> <a class="button dark" href="#/ski">Find my skis</a></section>`;
    return;
  }
  const total=pieces.reduce((sum,p)=>sum+(p.item.price||0),0);
  app.innerHTML=`<section class="setup-summary"><p class="eyebrow">MY SETUP</p><h1>Show this to<br><em>an associate.</em></h1><p class="muted">This is the setup you've built. Bring your phone to the counter — we'll help you check the final fit.</p><div class="setup-summary-list">${pieces.map(p=>`<article class="setup-summary-item">${photo(p.item)}<div><p class="eyebrow">${p.label}</p><h3>${escape(p.item.brand)} ${escape(p.item.model)}</h3>${p.extra?`<p class="setup-summary-extra">${escape(p.extra)}</p>`:''}<p>${money(p.item.price)}</p>${p.tier?`<button type="button" class="setup-item-info" data-summary-info="${p.kind}">Why this pick?</button>`:''}</div><button type="button" class="setup-remove" data-remove-piece="${p.kind}" aria-label="Remove ${p.kind}">×</button></article>`).join('')}</div><div class="setup-summary-total"><span>Total</span><strong>${money(total)}</strong></div><div class="setup-summary-actions">${board?`<a class="button dark" href="#/board/${encodeURIComponent(board.id)}">Edit setup</a>`:`<a class="button dark" href="${vocab(entry?.sport).href}">${vocab(entry?.sport).find}</a>`}<button class="text-button" id="clear-setup" type="button">Remove everything</button></div></section>`;
  app.querySelectorAll('[data-remove-piece]').forEach(btn=>btn.onclick=()=>{const current=getMySetup()||{};writeMySetup({...current,[btn.dataset.removePiece]:null});setup()});
  app.querySelectorAll('[data-summary-info]').forEach(btn=>btn.onclick=()=>{const kind=btn.dataset.summaryInfo;const item=entry[kind];if(!item)return;const companion=entry[kind==='boot'?'binding':'boot'];openSetupSheet(kind==='boot'?'BOOT':'BINDING',`${item.brand} ${item.model}`,setupItemBlurb(kind,item.tier||'recommended',item,Boolean(companion),entry.sport))});
  app.querySelector('#clear-setup').onclick=()=>{clearMySetup();setup()};
}
function openZoom(src){
  if(document.querySelector('.zoom-overlay'))return;
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const overlay=document.createElement('div');overlay.className='zoom-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Enlarged product image. Tap to close.');
  const big=document.createElement('img');big.className='zoom-img';big.src=src.currentSrc||src.src;big.alt=src.alt;big.referrerPolicy='no-referrer';
  const closeBtn=document.createElement('button');closeBtn.type='button';closeBtn.className='zoom-close';closeBtn.setAttribute('aria-label','Close enlarged image');closeBtn.textContent='×';
  const place=(r,pad)=>{Object.assign(big.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',padding:pad})};
  const fit=()=>{const w=Math.min(innerWidth-32,1100),h=innerHeight-32;return {left:(innerWidth-w)/2,top:(innerHeight-h)/2,width:w,height:h}};
  const pad=getComputedStyle(src).padding;
  place(src.getBoundingClientRect(),pad);
  if(still)big.style.transition='none';
  overlay.append(big,closeBtn);document.body.append(overlay);document.body.classList.add('zoom-lock');
  src.style.visibility='hidden';
  void big.offsetWidth;
  overlay.classList.add('open');place(fit(),'0px');
  let closing=false;
  const finish=()=>{overlay.remove();document.body.classList.remove('zoom-lock');src.style.visibility='';removeEventListener('keydown',onKey);removeEventListener('hashchange',finish);removeEventListener('resize',onResize)};
  const close=()=>{
    if(closing)return;closing=true;
    if(still||!src.isConnected){finish();return}
    overlay.classList.remove('open');place(src.getBoundingClientRect(),pad);
    setTimeout(finish,260);
  };
  const onKey=e=>{if(e.key==='Escape')close()};
  const onResize=()=>{if(!closing)place(fit(),'0px')};
  overlay.onclick=close;
  addEventListener('keydown',onKey);addEventListener('hashchange',finish);addEventListener('resize',onResize);
  closeBtn.focus({preventScroll:true});
}
app.addEventListener('click',e=>{const img=e.target.closest?.('.detail-media > img');if(!img)return;e.preventDefault();openZoom(img)});
window.addEventListener('hashchange',route);load();
