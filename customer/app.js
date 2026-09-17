import { rankBoards, terrainLabels, isWideSize, recommendedSetup } from './catalog.mjs';
const app=document.querySelector('#app');
const state={boards:[], answers:JSON.parse(sessionStorage.getItem('finderAnswers')||'null')||{ability:'',terrain:'',feel:'',height:'',weight:'',bootSize:'',bootUnit:'us',gender:''},step:0,showAll:false};
state.answers.bootUnit ||= 'us';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>v?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v):'';
const photo=(p,cls='')=>p.image?`<img class="${cls}" src="${escape(p.image)}" alt="${escape(p.brand+' '+p.model)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createElement('span'))">`:`<div class="photo-fallback">PLAYBOOK<br><small>Image coming soon</small></div>`;
const steps=[
  {key:'ability',title:'What’s your ability level?',subtitle:'',choices:[['Beginner','Getting comfortable'],['Intermediate','Confident on most runs'],['Advanced','Pushing into harder terrain'],['Expert','At home on demanding lines']]},
  {key:'terrain',title:'Where do you spend most days?',subtitle:'',choices:Object.entries(terrainLabels).map(([v,l])=>[v,l])},
  {key:'feel',title:'What kind of feel sounds right?',subtitle:'',choices:[['playful','Playful & forgiving'],['balanced','A bit of both'],['supportive','Supportive & precise']]},
  {key:'measurements',title:'Tell us about you.',subtitle:'',choices:[]},
  {key:'gender',title:'Let’s Filter Your Boards',subtitle:'',choices:[["Men's",'Men’s'],["Women's",'Women’s'],['Youth','Youth'],['Unisex','Unisex']]},
];
async function load(){try{let boards;try{const cfg=await import('./firebase-config.js');if(!cfg.firebaseConfig?.projectId)throw Error('No Firebase project');const [{initializeApp},{getFirestore,collection,getDocs}]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')]);const db=getFirestore(initializeApp(cfg.firebaseConfig));boards=(await getDocs(collection(db,'customerBoards'))).docs.map(d=>d.data());}catch(e){if(location.hostname!=='localhost'&&location.hostname!=='127.0.0.1')throw e;const r=await fetch('./data/catalog-preview.json');if(!r.ok)throw Error('Preview catalog unavailable');boards=(await r.json()).boards;}state.boards=boards;route();}catch(e){app.innerHTML='<section class="empty"><h1>Catalog unavailable</h1><p>Please try again later.</p></section>';console.error(e)}}
function route(){const path=decodeURIComponent(location.hash.slice(1));if(path.startsWith('/board/'))return detail(path.slice(7));if(path==='/results')return results();if(path==='/find'||path==='/snowboard')return question();if(path==='/ski')return skiHome();home()}
function home(){app.innerHTML=`<section class="sport-home"><p class="eyebrow">FIND MY GEAR</p><h1>Choose your<br><em>next ride.</em></h1><div class="sport-grid"><a class="sport-card snowboard" href="#/find"><img src="assets/snowboard-home.webp" alt="Snowboarder on snow"><span>SNOWBOARD</span><div><h2>Snowboard</h2><strong>Find my board ↗</strong></div></a><a class="sport-card ski" href="#/ski"><img src="assets/ski-home.webp" alt="Skier on snow"><span>SKI / COMING NEXT</span><div><h2>Ski</h2><strong>Explore ski ↗</strong></div></a></div></section>`}
function skiHome(){app.innerHTML=`<section class="sport-pending"><p class="eyebrow">FIND MY GEAR / SKI</p><h1>Ski is<br><em>coming next.</em></h1><p>We’re building a ski journey around ski-specific catalog data and sizing. The snowboard finder is ready to explore now.</p><a class="button dark" href="#/snowboard">Explore snowboards <span>↗</span></a><p><a href="#/">← Choose a sport</a></p></section>`}
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
  const index=options.findIndex(button=>Number(button.dataset.size)===target);
  grid.scrollTop=Math.max(0,(Math.floor(index/4)-1)*56);
}
function question(){
  const s=steps[state.step];
  const intro=`<div class="progress"><span>QUESTION ${state.step+1} / ${steps.length}</span><span>${Math.round((state.step+1)/steps.length*100)}%</span></div><div class="progress-bar"><i style="width:${(state.step+1)/steps.length*100}%"></i></div><p class="eyebrow">LET'S FIND YOUR LINE</p><h1>${s.title}</h1>${s.subtitle?`<p class="muted">${s.subtitle}</p>`:''}`;
  const measurements=`<form class="measurements" id="measurements"><label>Height <span>feet</span><input name="heightFeet" type="number" inputmode="numeric" min="3" max="7" step="1" required value="${escape(state.answers.height?Math.floor(state.answers.height/12):'')}"></label><label>Height <span>inches</span><input name="heightInches" type="number" inputmode="numeric" min="0" max="11" step="1" required value="${escape(state.answers.height?state.answers.height%12:'')}"></label><label>Weight <span>pounds</span><input name="weight" type="number" inputmode="numeric" min="20" max="400" step="1" required value="${escape(state.answers.weight||'')}"></label><div class="boot-picker"><p>Snowboard boot size</p><div class="unit-toggle" role="group" aria-label="Boot size unit"><button type="button" data-unit="us" aria-pressed="${state.answers.bootUnit!=='mondo'}">US</button><button type="button" data-unit="mondo" aria-pressed="${state.answers.bootUnit==='mondo'}">Mondo</button></div><div class="size-options" role="group" aria-label="Choose your boot size">${sizeOptions(state.answers.bootUnit,state.answers.bootSize)}</div><p class="picker-error" hidden>Please choose your boot size.</p></div><input name="bootSize" type="hidden" value="${escape(state.answers.bootSize||'')}"><button class="button dark" type="submit">Continue <span>↗</span></button></form>`;
  const choices=s.key==='measurements'?measurements:`<div class="choices">${s.choices.map(([v,l])=>`<button class="choice ${String(state.answers[s.key])===v?'selected':''}" data-value="${escape(v)}"><span>${escape(l)}</span><b>↗</b></button>`).join('')}</div>`;
  app.innerHTML=`<section class="finder">${intro}${choices}<div class="finder-actions"><button class="text-button" id="back">${state.step?'← Previous question':'← Choose a sport'}</button>${s.key==='feel'?'<button class="text-button" id="skip">Skip →</button>':''}</div></section>`;
  app.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{state.answers[s.key]=b.dataset.value;save();next()});
  const form=app.querySelector('#measurements');
  form?.querySelectorAll('[data-unit]').forEach(button=>button.onclick=()=>{state.answers.bootUnit=button.dataset.unit;state.answers.bootSize='';form.elements.bootSize.value='';form.querySelectorAll('[data-unit]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));form.querySelector('.size-options').innerHTML=sizeOptions(button.dataset.unit,'');form.querySelector('.picker-error').hidden=true;positionSizePicker(form);save()});
  form?.querySelector('.size-options').addEventListener('click',event=>{const button=event.target.closest('[data-size]');if(!button)return;form.elements.bootSize.value=button.dataset.size;state.answers.bootSize=Number(button.dataset.size);form.querySelectorAll('[data-size]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button))});form.querySelector('.picker-error').hidden=true;save()});
  form?.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;if(!form.elements.bootSize.value){form.querySelector('.picker-error').hidden=false;return}state.answers.height=Number(form.elements.heightFeet.value)*12+Number(form.elements.heightInches.value);state.answers.weight=Number(form.elements.weight.value);state.answers.bootSize=Number(form.elements.bootSize.value);save();next()});
  if(form)positionSizePicker(form);
  app.querySelector('#back').onclick=()=>{if(state.step){state.step--;question()}else location.hash='/'};
  app.querySelector('#skip')?.addEventListener('click',next);
}
function save(){sessionStorage.setItem('finderAnswers',JSON.stringify(state.answers))}

function next(){if(state.step<steps.length-1){state.step++;question()}else location.hash='/results'}
function results(){
  const ranked=rankBoards(state.boards,state.answers);
  const visible=ranked.filter(x=>x.eligible&&x.score>0);
  const shown=state.showAll?visible:visible.slice(0,3);
  app.innerHTML=`<section class="results-head"><p class="eyebrow">YOUR SHORTLIST</p><h1>Your Perfect<br><em>Boards.</em></h1><button class="why-trigger" id="why-results" type="button">Why these boards? ↗</button><div class="result-tools"><span>${visible.length} boards for you</span><a href="#/find" id="restart">Refine answers ↗</a></div></section><section class="cards">${shown.map(({board:b,reasons},i)=>`<a class="card" href="#/board/${encodeURIComponent(b.id)}"><div class="card-image">${photo(b)}<span class="card-number">${String(i+1).padStart(2,'0')}</span></div><div class="card-body"><p class="eyebrow">${escape(b.brand)}</p><h2>${escape(b.model)}</h2><p class="card-spec">${escape([b.shape,b.profile,b.flex&&b.flex+' flex'].filter(Boolean).join(' · '))}</p><div class="reasons">${reasons.map(r=>`<span>${escape(r)}</span>`).join('')}</div><div class="card-foot"><strong>${money(b.price)}</strong><span>View board ↗</span></div></div></a>`).join('')}</section>${visible.length>3&&!state.showAll?'<div class="more-wrap"><button class="button dark" id="show-more">Show me more <span>↗</span></button></div>':''}${visible.length?'':'<section class="empty"><h2>No direct matches yet.</h2><p>Try another choice or ask us for a fit check.</p></section>'}<dialog class="why-dialog" id="why-dialog"><button type="button" id="close-why" aria-label="Close">×</button><p class="eyebrow">WHY THESE BOARDS?</p><h2>Picked for your ride.</h2><p>We use your riding answers, height, weight, and boot size to find boards and listed sizes that may suit you. The first three are your strongest matches. We can help you check the final fit in store.</p></dialog>`;
  app.querySelector('#restart').onclick=()=>{state.step=0;state.showAll=false};
  app.querySelector('#show-more')?.addEventListener('click',()=>{state.showAll=true;results()});
  const dialog=app.querySelector('#why-dialog');app.querySelector('#why-results').onclick=()=>dialog.showModal();app.querySelector('#close-why').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close()};
}
function setupPanel(board,tier){
  const tiers=['recommended','upgrade','budget'].filter(candidate=>{
    const pair=recommendedSetup(board,candidate);
    return !pair.needsReview&&(pair.binding||pair.boot);
  });
  if(!tiers.length)return '<section class="setup setup-inline"><p class="eyebrow">COMPLETE THE RIDE</p><h2>Boots & bindings</h2><p>Ask us to help complete your setup.</p></section>';
  const selected=tiers.includes(tier)?tier:tiers[0];
  const pair=recommendedSetup(board,selected);
  const products=['binding','boot'].map(type=>{
    const item=pair[type];
    return item?`<article class="setup-item">${photo(item)}<div><p class="eyebrow">${type==='binding'?'BINDING':'BOOT'}</p><h3>${escape(item.brand)} ${escape(item.model)}</h3><p>${money(item.price)}</p></div></article>`:'';
  }).join('');
  return `<section class="setup setup-inline" id="setup-panel"><div class="setup-heading"><div><p class="eyebrow">COMPLETE THE RIDE</p><h2>Boots & bindings</h2></div></div>${tiers.length>1?`<div class="setup-tabs" role="tablist" aria-label="Setup options">${tiers.map(candidate=>`<button type="button" role="tab" data-tier="${candidate}" aria-selected="${candidate===selected}">${candidate==='recommended'?'Our pick':candidate==='budget'?'Budget':'Upgrade'}</button>`).join('')}</div>`:''}<div class="setup-grid">${products}</div><p class="setup-note">Try the full setup together for the right fit.</p></section>`;
}
function detail(id){
  const board=state.boards.find(item=>item.id===id);
  if(!board){app.innerHTML='<section class="empty"><h1>Board unavailable</h1><a href="#/results">Back to results</a></section>';return}
  const images=board.images?.length?board.images:[{url:board.image,alt:board.model}];
  const rank=rankBoards([board],state.answers)[0];
  const sizes=rank.sizing.best.map(size=>`<span class="size-match">${escape(size)}${isWideSize(size)?' · wide':''}</span>`).join('');
  app.innerHTML=`<div class="detail-back"><a href="#/results">← Back to results</a></div><article class="detail"><header class="detail-heading"><div><p class="eyebrow">${escape(board.brand)}</p><h1>${escape(board.model)}</h1></div><div class="detail-actions"><strong class="detail-price">${money(board.price)}</strong><button type="button" class="setup-jump" id="setup-jump">See setup ↓</button></div></header><div class="detail-media">${photo({brand:board.brand,model:board.model,image:images[0]?.url})}${images.length>1?`<div class="thumbs">${images.map((image,index)=>`<button data-img="${escape(image.url)}" aria-label="Show image ${index+1}"><img src="${escape(image.url)}" alt=""></button>`).join('')}</div>`:''}</div><div class="detail-info"><p class="description">${escape(board.description||'More details coming soon.')}</p><section class="sizes"><h2>My Size</h2>${sizes?`<div class="size-list">${sizes}</div><p class="fine">${rank.sizing.best.length>1?'More than one size may work for you. ':''}Try your size with boots and bindings for the final fit.</p>`:'<p>We can help you check the best size in store.</p>'}</section>${rank.reasons.length?`<div class="why"><h2>Why it fits your ride</h2>${rank.reasons.map(reason=>`<p>✓ ${escape(reason)}</p>`).join('')}</div>`:''}<dl class="specs">${[['Shape',board.shape],['Profile',board.profile],['Flex',board.flex]].filter(([,value])=>value).map(([label,value])=>`<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>${setupPanel(board,'recommended')}</div></article>`;
  app.querySelectorAll('[data-img]').forEach(button=>button.onclick=()=>{app.querySelector('.detail-media > img').src=button.dataset.img});
  app.querySelector('#setup-jump').onclick=()=>app.querySelector('.setup-inline').scrollIntoView({behavior:'smooth',block:'start'});
  function bindSetup(){app.querySelectorAll('[data-tier]').forEach(button=>button.onclick=()=>{app.querySelector('#setup-panel').outerHTML=setupPanel(board,button.dataset.tier);bindSetup()})}
  bindSetup();
}
window.addEventListener('hashchange',route);load();
