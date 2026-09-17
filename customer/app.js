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
function detail(id){
  const b=state.boards.find(x=>x.id===id);
  if(!b){app.innerHTML='<section class="empty"><h1>Board unavailable</h1><a href="#/results">Back to results</a></section>';return}
  const allImages=b.images?.length?b.images:[{url:b.image,alt:b.model}];
  const rank=rankBoards([b],state.answers)[0],sizeMatch=rank.sizing,setup=recommendedSetup(b);
  const recs=['binding','boot'].map(type=>{const r=setup[type];return r?`<article class="setup-item">${photo(r)}<div><p class="eyebrow">RECOMMENDED ${type.toUpperCase()}</p><h3>${escape(r.brand)} ${escape(r.model)}</h3><p>${money(r.price)}</p></div></article>`:''}).join('');
  const badges=sizeMatch.best.map(s=>`<span class="size-match">${escape(s)}${isWideSize(s)?' · wide':''}</span>`).join('');
  app.innerHTML=`<div class="detail-back"><a href="#/results">← Back to results</a></div><article class="detail"><div class="detail-media">${photo({brand:b.brand,model:b.model,image:allImages[0]?.url})}${allImages.length>1?`<div class="thumbs">${allImages.map((im,i)=>`<button data-img="${escape(im.url)}" aria-label="Show image ${i+1}"><img src="${escape(im.url)}" alt=""></button>`).join('')}</div>`:''}</div><div class="detail-info"><p class="eyebrow">${escape(b.brand)} / SNOWBOARD</p><h1>${escape(b.model)}</h1><div class="price">${money(b.price)}</div><p class="description">${escape(b.description||'More details coming soon.')}</p>${rank.reasons.length?`<div class="why"><h2>Why it fits your ride</h2>${rank.reasons.map(r=>`<p>✓ ${escape(r)}</p>`).join('')}</div>`:''}<dl class="specs">${[['Shape',b.shape],['Profile',b.profile],['Flex',b.flex],['Board width',b.width]].filter(([,v])=>v).map(([k,v])=>`<div><dt>${k}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl><section class="sizes"><h2>My Size</h2>${badges?`<div class="size-list">${badges}</div><p class="fine">${sizeMatch.best.length>1?'More than one listed size may work for you. ':''}Try your preferred size with your boots and bindings for the final fit.</p>`:'<p>We can help you check the best size in store.</p>'}</section></div></article><section class="setup"><p class="eyebrow">COMPLETE THE RIDE</p><h2>Suggested setup</h2><p>These boots and bindings are paired with this board. Check the fit before you ride.</p><div class="setup-grid">${setup.needsReview?'<p>The listed boot and binding need a compatibility check. Ask us to help complete your setup.</p>':recs||'<p>No setup recommendations listed yet.</p>'}</div></section>`;
  app.querySelectorAll('[data-img]').forEach(btn=>btn.onclick=()=>{app.querySelector('.detail-media > img').src=btn.dataset.img});
}
window.addEventListener('hashchange',route);load();
