(function(){
'use strict';

const SUPABASE_URL='https://ueuxnkrvvnvldfwgiyqy.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVldXhua3J2dm52bGRmd2dpeXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MjM0ODUsImV4cCI6MjEwNTI5OTQ4NX0.DwDSWdnVK1-eWLvSuXpsf22PLtMVq_ZJ-1Kq39AoOSI';
const T_PEOPLE='people',T_SETTINGS='settings',T_MEDIA='media',T_GIFTS='gifts',T_STORY='story_pages',T_EVENTS='event_countdowns',T_VOICE='voice_messages',T_VIDEO='video_messages',T_PINS='map_pins',T_GUEST='guest_submissions',T_UPLOADS='uploads',T_REVIEWS='reviews';
// 💐 Finished ledger constants (HD0.6)
const T_LEDGER='finished_ledger';
const FINISHED_BUCKET=window.FINISHED_BUCKET||'site-ledger';
const FINISHED_FILE='finished_people.json';
const FALLBACK_ADMIN_PW='Deepnectar@@1617@@';
// v2.8 FIX: the card link is now ALWAYS the CURRENT deployed URL (origin + path of this page),
// never a hard-coded placeholder — so sharing / WhatsApp messages always contain a working link.
const PUBLIC_CARD_FALLBACK='https://deepnectar.vercel.app/'; // used only if window.location is unavailable
function getCurrentCardBaseUrl(){
  try{
    const loc=window.location||{};
    if(loc.origin&&loc.origin!=='null'&&loc.protocol!=='file:'){
      let p=String(loc.pathname||'/');
      p=p.replace(/index\.html?$/i,'');
      return loc.origin+p;
    }
  }catch(e){}
  return PUBLIC_CARD_FALLBACK;
}
function getPublicCardLink(){ return getCurrentCardBaseUrl(); }
function buildCardLink(slug){
  const base=getPublicCardLink();
  const s=String(slug||'').trim();
  if(!s)return base;
  return base+(base.indexOf('?')===-1?'?':'&')+'person='+encodeURIComponent(s);
}
const DEFAULT_TZ='Asia/Dubai';
const MODAL_IMG_DURATION_MS = 10000;

const TZ_OPTIONS=[
  {v:'Asia/Dubai',l:'🇦🇪 Dubai / UAE (UTC+4) — default'},
  {v:'Asia/Kolkata',l:'🇮🇳 India (UTC+5:30)'},
  {v:'Asia/Karachi',l:'🇵🇰 Pakistan (UTC+5)'},
  {v:'Asia/Dhaka',l:'🇧🇩 Bangladesh (UTC+6)'},
  {v:'Asia/Kathmandu',l:'🇳🇵 Nepal (UTC+5:45)'},
  {v:'Asia/Colombo',l:'🇱🇰 Sri Lanka (UTC+5:30)'},
  {v:'Asia/Riyadh',l:'🇸🇦 Riyadh (UTC+3)'},
  {v:'Asia/Qatar',l:'🇶🇦 Qatar (UTC+3)'},
  {v:'Asia/Kuwait',l:'🇰🇼 Kuwait (UTC+3)'},
  {v:'Asia/Istanbul',l:'🇹🇷 Istanbul (UTC+3)'},
  {v:'Asia/Singapore',l:'🇸🇬 Singapore (UTC+8)'},
  {v:'Asia/Kuala_Lumpur',l:'🇲🇾 Kuala Lumpur (UTC+8)'},
  {v:'Asia/Shanghai',l:'🇨🇳 China (UTC+8)'},
  {v:'Asia/Hong_Kong',l:'🇭🇰 Hong Kong (UTC+8)'},
  {v:'Asia/Tokyo',l:'🇯🇵 Tokyo (UTC+9)'},
  {v:'Asia/Seoul',l:'🇰🇷 Seoul (UTC+9)'},
  {v:'Asia/Bangkok',l:'🇹🇭 Bangkok (UTC+7)'},
  {v:'Asia/Jakarta',l:'🇮🇩 Jakarta (UTC+7)'},
  {v:'Asia/Manila',l:'🇵🇭 Manila (UTC+8)'},
  {v:'Australia/Sydney',l:'🇦🇺 Sydney (UTC+10/+11)'},
  {v:'Australia/Perth',l:'🇦🇺 Perth (UTC+8)'},
  {v:'Pacific/Auckland',l:'🇳🇿 Auckland (UTC+12/+13)'},
  {v:'Europe/London',l:'🇬🇧 London (UTC+0/+1)'},
  {v:'Europe/Paris',l:'🇫🇷 Paris / Berlin (UTC+1/+2)'},
  {v:'Europe/Moscow',l:'🇷🇺 Moscow (UTC+3)'},
  {v:'Europe/Athens',l:'🇬🇷 Athens (UTC+2/+3)'},
  {v:'Africa/Cairo',l:'🇪🇬 Cairo (UTC+2)'},
  {v:'Africa/Nairobi',l:'🇰🇪 Nairobi (UTC+3)'},
  {v:'Africa/Johannesburg',l:'🇿🇦 Johannesburg (UTC+2)'},
  {v:'America/New_York',l:'🇺🇸 New York (UTC-5/-4)'},
  {v:'America/Chicago',l:'🇺🇸 Chicago (UTC-6/-5)'},
  {v:'America/Denver',l:'🇺🇸 Denver (UTC-7/-6)'},
  {v:'America/Los_Angeles',l:'🇺🇸 Los Angeles (UTC-8/-7)'},
  {v:'America/Toronto',l:'🇨🇦 Toronto (UTC-5/-4)'},
  {v:'America/Sao_Paulo',l:'🇧🇷 São Paulo (UTC-3)'},
  {v:'UTC',l:'🌐 UTC (no offset)'}
];

const $=id=>document.getElementById(id);
function txt(el,v){if(el)el.textContent=v||''}

/* ── Popup layer manager (v2.9) ────────────────────────────────────────────
   PROBLEM: the admin / requester panels are full-screen overlays, and older
   popups (info-modals, message boxes, confirmations) had LOWER z-index than
   those panels — so a message appeared *behind* the panel and you had to
   close the panel to read it.
   FIX: every overlay element gets bumped above the panel when opened; the one
   opened last is marked `.is-topmost`. Toasts sit above everything. */
const OVERLAY_SEL='.panel-modal,.info-modal,.pw-modal,.slideshow-overlay,.pop-layer';
let _zSeq=0;
function bumpOverlayZ(el){
  if(!el)return el;
  document.querySelectorAll(OVERLAY_SEL).forEach(o=>o.classList.remove('is-topmost'));
  el.style.zIndex=String(100000+(++_zSeq));
  el.classList.add('is-topmost');
  return el;
}
function show(el){ if(el){ bumpOverlayZ(el); el.classList.add('active'); } }
function hide(el){ if(el){ el.classList.remove('active','is-topmost'); el.style.zIndex=''; } }

/* ── In-page alert / confirm / prompt ──────────────────────────────────────
   window.alert()/confirm() can be rendered by the browser *behind* a
   full-screen fixed panel (and they block JS), so all messages now use these
   promise-based in-page popups that always appear on top of the panel.
   The classic blocking names `alert()` / `confirm()` / `prompt()` are kept
   working too — they render synchronously and spin a tiny nested event loop
   while waiting (so existing call-sites need no changes). */
const ALERT_ICONS={info:'💌',warn:'⚠️',error:'❌',success:'✅',wa:'💬'};
function pickAlertIcon(msg,kind){
  const k=String(kind||'').toLowerCase();
  if(ALERT_ICONS[k])return ALERT_ICONS[k];
  const m=String(msg||'');
  if(/^(❌|🚫|⛔)/u.test(m))return '❌';
  if(/^(⚠️|⚠)/u.test(m))return '⚠️';
  if(/^(✅|💾|💐|🗑️|↩️|🆕|✏️|📲|💬|🔒|🔐|🎉|💖|💕|💛|🌐|📅|📸|🎁|🥳|😢|🤝|🙏|🎂|🍰|🎈|⭐|❤️|🧹|⏳|👁️|📋|📤|📥|🔑|💡|🎬|🔊|🗺️|📖|🎵|🕒|💯|🧡|💗|💘|🌹|🍫|🎀|✨|🌟|🥰|😊|😍|🤩|👏|🙌|💪|🎓|🏆|🎯|🧷|📌|📎|🔖|📣|🔔)/u.test(m))return '';
  return '💌';
}
function ensurePopLayer(){
  let l=$('popLayer');
  if(!l){
    l=document.createElement('div');
    l.id='popLayer';l.className='pop-layer';l.setAttribute('role','dialog');l.setAttribute('aria-modal','true');
    l.innerHTML='<div class="pop-card"><div class="pop-icon" id="popIcon"></div><div class="pop-title" id="popTitle"></div>'+
      '<div class="pop-msg" id="popMsg"></div><input type="text" class="pop-input" id="popInput" autocomplete="off" style="display:none">'+
      '<div class="pop-actions" id="popActions"></div></div>';
    document.body.appendChild(l);
  }
  return l;
}
function popOpen(el){
  if(el&&el.classList&&el.classList.contains('pop-layer')){ bumpOverlayZ(el); el.classList.add('active'); }
}
function popClose(el){
  if(el&&el.classList&&el.classList.contains('pop-layer')){ el.classList.remove('active','is-topmost'); el.style.zIndex=''; }
}
function popShell(opts){
  opts=opts||{};
  const l=ensurePopLayer(),icon=$('popIcon'),title=$('popTitle'),msg=$('popMsg'),inp=$('popInput'),acts=$('popActions');
  const ic=ALERT_ICONS[opts.kind]?ALERT_ICONS[opts.kind]:pickAlertIcon(opts.message,opts.kind);
  icon.textContent=ic||'';icon.style.display=ic?'':'none';
  title.textContent=opts.title||'';title.style.display=opts.title?'':'none';
  msg.textContent=opts.message||'';
  const hasInput=!!opts.input;
  inp.style.display=hasInput?'':'none';
  if(hasInput){ inp.value=opts.value||''; inp.placeholder=opts.placeholder||''; inp.type=opts.inputType||'text'; }
  else{ inp.value=''; }
  acts.innerHTML='';
  const mk=(label,cls,val)=>{
    const b=document.createElement('button');b.type='button';b.className='pop-btn '+cls;b.textContent=label;
    b.onclick=()=>{ close(val); };
    acts.appendChild(b);return b;
  };
  let settled=false,fns=[];
  function close(v){ if(settled)return; settled=true; fns.forEach(f=>{try{f()}catch(e){}}); popClose(l); if(opts.onClose)opts.onClose(v); }
  const escHandler=e=>{
    if(e.key==='Escape'){ e.preventDefault(); close(hasInput?null:(opts.cancelValue!==undefined?opts.cancelValue:false)); }
    else if(e.key==='Enter'&&hasInput){ e.preventDefault(); close(inp.value); }
  };
  document.addEventListener('keydown',escHandler,true);
  fns.push(()=>document.removeEventListener('keydown',escHandler,true));
  if(opts.dismissible!==false&&!hasInput){
    l.addEventListener('click',e=>{ if(e.target===l) close(opts.cancelValue!==undefined?opts.cancelValue:false); });
  }
  popOpen(l);
  if(hasInput)setTimeout(()=>{try{inp.focus();inp.select()}catch(e){}},60);
  return {layer:l,input:inp,btn:mk,close:close};
}
window.__popMessage=function(message,kind,title){
  return new Promise(res=>{
    const s=popShell({message:message,kind:kind||'info',title:title||''});
    s.btn('OK','ok',true);
    const ob=s.layer.querySelector('.pop-btn.ok');if(ob)setTimeout(()=>{try{ob.focus()}catch(e){}},60);
    const wait=setInterval(()=>{ if(!s.layer.classList.contains('active')){clearInterval(wait);res(true)} },80);
    s.layer._done=()=>{clearInterval(wait);res(true)};
  });
};
window.__popConfirm=function(message,opts){
  opts=opts||{};
  return new Promise(res=>{
    const s=popShell({message:message,kind:opts.kind||'warn',title:opts.title||''});
    s.btn(opts.cancelText||'Cancel','no',false);
    const okBtn=s.btn(opts.okText||'OK','ok',true);
    if(opts.danger){ okBtn.classList.remove('ok'); okBtn.style.background='linear-gradient(135deg,#c41e3a,#8b0028)'; okBtn.style.color='#fff'; }
    if(opts.wa){ okBtn.classList.remove('ok'); okBtn.classList.add('wa'); }
    setTimeout(()=>{try{okBtn.focus()}catch(e){}},60);
    const wait=setInterval(()=>{ if(!s.layer.classList.contains('active')){clearInterval(wait);} },80);
  });
};
window.__popPrompt=function(message,value,opts){
  opts=opts||{};
  return new Promise(res=>{
    const s=popShell({message:message,kind:opts.kind||'info',title:opts.title||'',input:true,value:value||'',placeholder:opts.placeholder||'',inputType:opts.inputType||'text'});
    s.btn('Cancel','no',null);
    s.btn(opts.okText||'OK','ok',undefined);
    const okBtn=s.layer.querySelectorAll('.pop-btn')[1];
    okBtn.onclick=()=>{ s.close(s.input.value); };
    const wait=setInterval(()=>{ if(!s.layer.classList.contains('active')){clearInterval(wait);res(null)} },80);
  });
};
/* Synchronous, non-native replacements for alert/confirm/prompt. They paint the
   popup first and then run a tiny nested event loop until the user answers. */
function popSpinUntil(layer){
  return new Promise(res=>{
    const check=()=>{ if(!layer.classList.contains('active'))res(); };
    const mo=new MutationObserver(check);
    mo.observe(layer,{attributes:true,attributeFilter:['class']});
    const iv=setInterval(check,50);
    layer._spinStop=()=>{clearInterval(iv);mo.disconnect()};
  });
}
window.__syncAlert=function(message,kind){
  const s=popShell({message:String(message==null?'':message),kind:kind||'info'});
  s.btn('OK','ok',true);
  try{ s.layer._done&&s.layer._done(); }catch(e){}
  // paint + nested loop (mirrors native alert without leaving the page context)
  const start=Date.now();
  const t=setInterval(()=>{},0);clearInterval(t);
  return popSpinUntil(s.layer);
};
window.__syncConfirm=function(message,opts){
  opts=opts||{};
  let answered=false,result=false;
  const s=popShell({message:String(message==null?'':message),kind:opts.kind||'warn',title:opts.title||''});
  s.btn(opts.cancelText||'Cancel','no',false);
  const okBtn=s.btn(opts.okText||'OK',opts.danger?'no':'ok',true);
  if(opts.danger){ okBtn.style.background='linear-gradient(135deg,#c41e3a,#8b0028)';okBtn.style.color='#fff'; }
  okBtn.onclick=()=>{ result=true; answered=true; s.close(true); };
  s.layer.querySelectorAll('.pop-btn')[0].onclick=()=>{ result=false; answered=true; s.close(false); };
  return popSpinUntil(s.layer).then(()=>answered?result:false);
};
window.__syncPrompt=function(message,value){
  const s=popShell({message:String(message==null?'':message),kind:'info',input:true,value:value||''});
  s.btn('Cancel','no',null);
  const okBtn=s.layer.querySelectorAll('.pop-btn')[1];
  okBtn.onclick=()=>{ s.close(s.input.value); };
  return popSpinUntil(s.layer).then(()=>{ const v=s.input.value; return v||null; });
};

/* ── Auto-WhatsApp opener (v2.9) ───────────────────────────────────────────
   WhatsApp / the browser blocks `window.open()` when it is not fired straight
   from a user gesture (e.g. after an await, or after a native alert/confirm
   popup was dismissed). So every "💬 Send on WhatsApp" click now:
     1. opens wa.me SYNCHRONOUSLY inside the click handler (always allowed), and
     2. ALSO queues a guarded re-open that fires if the first attempt got
        blocked — so the requester never has to hunt for the button again. */
const WA_PENDING=[];
function waBuildUrl(digits,msg){
  const d=String(digits||'').replace(/[^0-9]/g,'');
  const base=d?('https://wa.me/'+d):'https://wa.me/';
  return base+'?text='+encodeURIComponent(String(msg||''));
}
function waOpenNow(digits,msg){
  const url=waBuildUrl(digits,msg);
  let w=null;
  try{ w=window.open(url,'_blank','noopener'); }catch(e){ w=null; }
  if(!w){ try{ w=window.open(url,'_blank'); }catch(e){ w=null; } }
  if(!w){ // last resort: same-tab navigation + queued retry
    try{ WA_PENDING.push(url); }catch(e){}
    try{ window.location.href=url; }catch(e){}
    return false;
  }
  try{ if(w.focus)w.focus(); }catch(e){}
  return true;
}
function waFlushPending(){
  if(!WA_PENDING.length)return;
  const urls=WA_PENDING.splice(0,WA_PENDING.length);
  urls.forEach(u=>{ try{ window.open(u,'_blank','noopener'); }catch(e){} });
}
document.addEventListener('click',waFlushPending,true);
document.addEventListener('touchend',waFlushPending,true);
setInterval(waFlushPending,4000);

const S=window.__PAGE_STATE__||(window.__PAGE_STATE__={});
S.PEOPLE=S.PEOPLE||[];
S.CURR=S.CURR||{texts:{},textsByLang:{en:{},gu:{},hi:{}},shared:{},gifts:[],story:[],events:[],voice:[],video:[],pins:[],media:[]};
S.CURRENT_PERSON=S.CURRENT_PERSON||null;
S.ADMIN_MODE=S.ADMIN_MODE||false;
S.PREVIEW_MODE=S.PREVIEW_MODE||false;
S.CURRENT_SETTINGS=S.CURRENT_SETTINGS||{};
S.ADMIN_EDIT_PERSON_ID=S.ADMIN_EDIT_PERSON_ID||null;
S.CURR_LANG=S.CURR_LANG||'en';
S.LOGIN_TARGET=S.LOGIN_TARGET||null;
S.CURRENT_TEXTS_BY_LANG=S.CURRENT_TEXTS_BY_LANG||{en:{},gu:{},hi:{}};
S.ADMIN_EDIT_LANG='en';
S.GUEST_TEXTS=S.GUEST_TEXTS||{en:{},gu:{},hi:{}};
S.GUEST_EDIT_LANG='en';
S.CARD_STARTED=false;
S.REVIEWS=S.REVIEWS||[];
S.HOME_REVIEW_LIMIT=S.HOME_REVIEW_LIMIT||10;
S.REVIEW_STARS=0;
S.EXPANDED_PEOPLE=S.EXPANDED_PEOPLE||new Set();
S.REQUESTER_MODE=S.REQUESTER_MODE||false;

const GE={person:{display_name:'',slug:'',birthday:''},guest:{name:'',whatsapp:'',relation:'',occasion:'',note:''},password:'',texts:{en:{},gu:{},hi:{}},lang:'en',theme:'',counters:{},gifts:[],story:[],events:[],voice:[],video:[],pins:[],media:[],privateMedia:[],guestRow:null};
const RE={lang:'en',texts:{en:{},gu:{},hi:{}},shared:{},theme:'',counters:{},gifts:[],story:[],events:[],voice:[],video:[],pins:[],media:[],privateMedia:[]};

const COUNTERS=[
  {id:'ct1',icon:'💬',labelKey:'ct1_label',dtKey:'ct1_datetime',tzKey:'ct1_datetime_tz',dispKey:'ct1_dispdate',showKey:'ct1_show',mainLabel:'ctMain1_label',mainDate:'ctMain1_date',mainRow:'ctMain1'},
  {id:'ct2',icon:'💕',labelKey:'ct2_label',dtKey:'ct2_datetime',tzKey:'ct2_datetime_tz',dispKey:'ct2_dispdate',showKey:'ct2_show',mainLabel:'ctMain2_label',mainDate:'ctMain2_date',mainRow:'ctMain2'},
  {id:'ct3',icon:'💍',labelKey:'ct3_label',dtKey:'ct3_datetime',tzKey:'ct3_datetime_tz',dispKey:'ct3_dispdate',showKey:'ct3_show',mainLabel:'ctMain3_label',mainDate:'ctMain3_date',mainRow:'ctMain3'}
];

// FIX 1: TEXT_FIELDS no longer includes ct1_label/ct2_label/ct3_label (they live only in Lock tab)
const TEXT_FIELDS=[
  'pageTitle','mainHeadline','subhead1','subhead2','greeting','msg1','msg2','msg3','msg4','msg5',
  'signoff','namesBadge','fromLabel','countersTitle',
  'openMemoriesBtn','openPrivateMemoriesBtn','storyBtnText','mapBtnText','uploadBtnText','voiceBtnText','videoBtnText',
  'giftSectionTitle','eventSectionTitle',
  'openLine1','openLine2','cakeHint',
  'lockTitle','lockSubtitle','lockDateText','countdownLabel',
  'daysLabel','hoursLabel','minsLabel','secsLabel','openEarlyText','pwError','pwLockedMsg',
  'closeTitle','close1','close2','close3','close4','closeSignoff','closeBtn'
];

function zonedToUTC(localStr,tz){
  if(!localStr)return null;
  const m=localStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if(!m)return null;
  const y=+m[1],mo=+m[2]-1,d=+m[3],h=+m[4],mi=+m[5],s=+(m[6]||0);
  tz=tz||DEFAULT_TZ;
  const guess=Date.UTC(y,mo,d,h,mi,s);
  const dtf=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  const parts=dtf.formatToParts(new Date(guess));
  const get=k=>+parts.find(p=>p.type===k).value;
  const asZoned=Date.UTC(get('year'),get('month')-1,get('day'),get('hour')%24,get('minute'),get('second'));
  const offset=guess-asZoned;
  return new Date(guess+offset).toISOString();
}
function utcToZonedLocal(iso,tz){
  if(!iso)return'';
  const d=new Date(iso);if(isNaN(d.getTime()))return'';
  tz=tz||DEFAULT_TZ;
  const dtf=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
  const parts=dtf.formatToParts(d);
  const get=k=>parts.find(p=>p.type===k).value;
  let hour=get('hour');if(hour==='24')hour='00';
  return get('year')+'-'+get('month')+'-'+get('day')+'T'+hour+':'+get('minute');
}
function fillTzSelect(el,current){
  if(!el)return;
  const cur=current||DEFAULT_TZ;
  if(el.options.length===0){ TZ_OPTIONS.forEach(o=>{const opt=document.createElement('option');opt.value=o.v;opt.textContent=o.l;el.appendChild(opt)}); }
  el.value=TZ_OPTIONS.find(o=>o.v===cur)?cur:DEFAULT_TZ;
}
function initAllTzSelects(){ document.querySelectorAll('.tz-select').forEach(el=>{ fillTzSelect(el,el.dataset.currentTz||DEFAULT_TZ); }); }

function dedupeMedia(rows){
  const seen=new Set();const out=[];
  (rows||[]).forEach(r=>{
    if(!r)return;
    const key=((r.drive_id||'').trim().toLowerCase())||((r.src||'').trim().toLowerCase());
    if(!key)return;
    if(seen.has(key))return;
    seen.add(key);out.push(r);
  });
  return out;
}

// ---- Bulk paste helper: auto-split mixed input into direct http(s) links (→ videos) and Drive IDs (→ photos) ----
// Accepts items separated by commas, newlines, spaces or tabs. Any token that looks like an http/https URL
// becomes a {type:'video', src:<url>} row; everything else is treated as a Drive ID → {type:'photo', drive_id:<id>} row.
function parseBulkMedia(rawText,opts){
  const o=opts||{};
  const tokens=String(rawText||'').split(/[,\n\r\t ]+/).map(x=>x.trim()).filter(Boolean);
  const vids=[],photos=[];
  tokens.forEach(t=>{
    if(/^https?:\/\//i.test(t)) vids.push({type:'video',drive_id:'',src:t,title:''});
    else photos.push({type:'photo',drive_id:t,src:'',title:''});
  });
  if(o.priv){
    vids.forEach(m=>{m.priv=true});
    photos.forEach(m=>{m.priv=true});
  }
  return {vids,photos,total:tokens.length};
}

function last4Digits(s){
  const digits=String(s||'').replace(/\D/g,'');
  if(digits.length<4)return digits.padStart(4,'0');
  return digits.slice(-4);
}
function firstNameOf(name){
  const n=String(name||'').trim();
  if(!n)return '';
  return n.split(/\s+/)[0].replace(/[^A-Za-z]/g,'')||'';
}
// ✏️ Edit / Card Password — auto-generated KEY for the Requester EDIT password & Card Password.
// (Not a card greeting message — this is the login/edit credential.)
// Rules: max 8 characters, unique per person, deterministic (same inputs → same key), always uppercase.
const PW_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike chars (no I/O/0/1)
function editPwHash(s){
  let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
  return h>>>0;
}
function editPwFromSeed(seed){
  // deterministic 8-char key derived from the seed (requester first name + last-4 WhatsApp digits + Login ID/slug)
  let n=editPwHash(String(seed||''));
  let out='';
  for(let i=0;i<8;i++){out+=PW_ALPHABET.charAt(n%PW_ALPHABET.length);n=Math.floor(n/PW_ALPHABET.length)||editPwHash(out+i)}
  return out;
}
function normalizeEditPw(v){
  // legacy long-format keys ({FirstName}-EDIT-{last4}-{slug}) are upgraded to the new short 8-letter format
  if(/^.*-EDIT-.*$/i.test(String(v||'')))return '';
  return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
}
function makeRequesterEditPassword(requesterName,requesterWhatsapp,slug,stored){
  const storedNorm=normalizeEditPw(stored);
  if(storedNorm)return storedNorm; // keep the existing unique key stable across edits
  const fn=firstNameOf(requesterName);
  const l4=last4Digits(requesterWhatsapp);
  const sl=String(slug||'').toLowerCase().replace(/[^a-z0-9\-_]/g,'');
  if(!fn||!l4||!sl)return '';
  return editPwFromSeed(fn.toUpperCase()+'|'+l4+'|'+sl); // max 8 letters, unique per person
}
function getEditPasswordForPerson(p){
  if(!p)return '';
  return makeRequesterEditPassword(p.requester_name||'',p.requester_whatsapp||'',p.slug||'',p.edit_password||'');
}
// Enforce uniqueness of an 8-letter auto key against all other people (deterministic collision suffix).
function ensureUniqueEditPw(base,candidates,selfIdx){
  const norm=String(base||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
  if(!norm)return '';
  let taken={};
  (candidates||[]).forEach((p,i)=>{
    if(selfIdx!=null&&i===selfIdx)return;
    const k=getEditPasswordForPerson(p);
    if(k)taken[k]=true;
  });
  if(!taken[norm])return norm;
  for(let d=1;d<=999;d++){
    const v=norm.slice(0,7)+String(d%10);
    if(!taken[v])return v;
  }
  return norm;
}
// 🔒 View Key (viewer/Card password) — SAME RULES as the ✏️ Edit Key:
// auto-generated, unique per person, max 8 characters, deterministic (same inputs → same key), always uppercase.
function normalizeViewPw(v){
  // legacy long-format keys (Name-DDMM-Word) are upgraded to the new short 8-letter format
  if(/^[A-Za-z]+-\d{4}-[A-Za-z]+$/.test(String(v||'').trim()))return '';
  return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
}
function makeViewerPassword(displayName,birthday,slug,stored){
  const storedNorm=normalizeViewPw(stored);
  if(storedNorm)return storedNorm; // keep the existing unique key stable across edits
  const nm=String(displayName||'Friend').trim();
  let dd='0000';
  if(birthday){const d=new Date(birthday);if(!isNaN(d.getTime()))dd=String(d.getDate()).padStart(2,'0')+String(d.getMonth()+1).padStart(2,'0')+String(d.getFullYear()).slice(-2)}
  const sl=String(slug||'').toLowerCase().replace(/[^a-z0-9\-_]/g,'');
  return editPwFromSeed('VIEW|'+nm.toUpperCase()+'|'+dd+'|'+sl); // max 8 letters, unique per person
}
// Enforce uniqueness of an 8-letter View Key against all other people (deterministic collision suffix).
function ensureUniqueViewPw(base,candidates,selfIdx){
  const norm=String(base||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
  if(!norm)return '';
  let taken={};
  (candidates||[]).forEach((p,i)=>{
    if(selfIdx!=null&&i===selfIdx)return;
    const k=normalizeViewPw(p.password);
    if(k)taken[k]=true;
  });
  if(!taken[norm])return norm;
  for(let d=1;d<=999;d++){
    const v=norm.slice(0,7)+String(d%10);
    if(!taken[v])return v;
  }
  return norm;
}
// Private-media OTP: deterministic 6-digit code derived from the Requester's Edit Key.
// Generated ONLY in the Requester Portal (when requester name + WhatsApp + slug are filled) and shared with the couple.
function makePrivateOtp(editPw){
  const s=String(editPw||'');
  if(!s)return '';
  let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
  return String(h%1000000).padStart(6,'0');
}
function getPrivateOtpForPerson(p){
  return makePrivateOtp(getEditPasswordForPerson(p));
}
function shuffleArray(arr){
  const a=(arr||[]).slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    const t=a[i];a[i]=a[j];a[j]=t;
  }
  return a;
}
function splitDriveIds(raw){
  return String(raw||'').split(',').map(x=>x.trim()).filter(Boolean);
}
function driveImg(id,w){ return 'https://lh3.googleusercontent.com/d/'+id+'=w'+(w||2000); }
function getShared(k,def){const s=S.CURR.shared||{};return s[k]!==undefined?s[k]:def}
function getText(k,def){const t=S.CURR.texts||{};return t[k]!==undefined?t[k]:def}

// FIX 3: duration clamps
function clampDuration(v,def,min,max){
  let n=parseFloat(v);
  if(!isFinite(n)||n<=0)n=def;
  return Math.max(min,Math.min(max,n));
}

const sb={
  h(){return{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY,'Content-Type':'application/json','Prefer':'return=representation'}},
  hd(){return{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY}},
  async people(){try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_PEOPLE}?select=*&order=sort_order.asc,id.asc`,{headers:this.h(),cache:'no-store'});if(!r.ok)return[];return r.json()}catch(e){return[]}},
  async insPerson(row){const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_PEOPLE}`,{method:'POST',headers:this.h(),body:JSON.stringify(row)});if(!r.ok){const t=await r.text();throw new Error('insert person '+r.status+' '+t)}return r.json()},
  async updPerson(id,p){const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_PEOPLE}?id=eq.${id}`,{method:'PATCH',headers:this.h(),body:JSON.stringify(p)});if(!r.ok){const t=await r.text();throw new Error('update person '+r.status+' '+t)}return r.json()},
  async delPerson(id){const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_PEOPLE}?id=eq.${id}`,{method:'DELETE',headers:this.hd()});if(!r.ok){const t=await r.text();throw new Error('delete person '+r.status+' '+t)}},
  async rows(table,pid){try{let u=`${SUPABASE_URL}/rest/v1/${table}?select=*`;if(pid!=null)u+=`&person_id=eq.${pid}`;const r=await fetch(u,{headers:this.h(),cache:'no-store'});if(!r.ok)return[];return r.json()}catch(e){return[]}},
  async getSet(pid){try{let u=`${SUPABASE_URL}/rest/v1/${T_SETTINGS}?select=key,value`;if(pid===null)u+='&person_id=is.null';else if(pid!=null)u+=`&person_id=eq.${pid}`;const r=await fetch(u,{headers:this.h(),cache:'no-store'});if(!r.ok)return{};const rows=await r.json();const o={};rows.forEach(x=>o[x.key]=x.value);return o}catch(e){return{}}},
  async upSet(obj,pid){
    const keys=Object.keys(obj);if(!keys.length)return;
    try{
      const keyList=keys.map(k=>'"'+k+'"').join(',');
      let delUrl=`${SUPABASE_URL}/rest/v1/${T_SETTINGS}?key=in.(${keyList})`;
      if(pid!=null)delUrl+=`&person_id=eq.${pid}`;else delUrl+='&person_id=is.null';
      await fetch(delUrl,{method:'DELETE',headers:this.hd()});
    }catch(e){}
    const rows=keys.map(k=>{const r={key:k,value:String(obj[k])};if(pid!=null)r.person_id=pid;return r});
    const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_SETTINGS}`,{method:'POST',headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(rows)});
    if(!r.ok){const t=await r.text();throw new Error('settings '+r.status+' '+t)}
    return r.json();
  },
  async insBatch(table,rows){if(!rows||!rows.length)return;
    // PostgREST requires every object in a batch array to have EXACTLY the same keys
    // (otherwise 400 PGRST102 "All object keys must match"). Normalize all rows to a
    // single shared key-set, filling missing keys with null before sending.
    const norm=(rs)=>{const keys=new Set();rs.forEach(r=>Object.keys(r||{}).forEach(k=>keys.add(k)));return rs.map(r=>{const o={};keys.forEach(k=>{o[k]=(r&&Object.prototype.hasOwnProperty.call(r,k)&&r[k]!==undefined)?r[k]:null});return o})};
    let body=norm(rows);
    // If the table lacks a `priv` column, fall back to encoding privacy in the title prefix so nothing is lost.
    try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:'POST',headers:this.h(),body:JSON.stringify(body)});if(r.ok)return r.json();
      const t=await r.text();
      // Unknown-column errors from PostgREST (PGRST204 etc.) — retry without the offending key.
      const colMatch=/Could not find the '(.*?)' column|invalid.*'([a-zA-Z_][a-zA-Z0-9_]*)'/.exec(t);
      if(table===T_MEDIA&&(colMatch||/priv/.test(t))){body=norm(rows.map(m=>{const c=Object.assign({},m);delete c.priv;if(m.priv===true||isPrivateRow(m))c.title=privTitle(stripPrivTitle(m.title));return c}));const r2=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:'POST',headers:this.h(),body:JSON.stringify(body)});if(!r2.ok){const t2=await r2.text();throw new Error('batch insert '+table+' '+r2.status+' '+t2)}return r2.json()}
      // PGRST102 safety-net: normalize keys and retry once even if we didn't anticipate the mismatch.
      if(/PGRST102|All object keys must match/.test(t)){body=norm(rows);const r3=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:'POST',headers:this.h(),body:JSON.stringify(body)});if(!r3.ok){const t3=await r3.text();throw new Error('batch insert '+table+' '+r3.status+' '+t3)}return r3.json()}
      throw new Error('batch insert '+table+' '+r.status+' '+t);
    }catch(e){throw e instanceof Error&&/batch insert/.test(e.message)?e:new Error('batch insert '+table+': '+(e.message||'network'))}
  },
  async upd(table,id,patch){const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`,{method:'PATCH',headers:this.h(),body:JSON.stringify(patch)});if(!r.ok){const t=await r.text();throw new Error('update '+table+' '+t)}return r.json()},
  async wipe(table,pid){try{await fetch(`${SUPABASE_URL}/rest/v1/${table}?person_id=eq.${pid}`,{method:'DELETE',headers:this.hd()})}catch(e){}},
  // HD0.6: finished_ledger is the permanent cloud source of truth — no wipe routine may ever clear it.
  async wipeAll(table){if(table===T_LEDGER){console.warn('[wipeAll] refused: finished_ledger is protected');return;}try{await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=gt.0`,{method:'DELETE',headers:this.hd()})}catch(e){}},
  async delGuest(id){try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_GUEST}?id=eq.${id}`,{method:'DELETE',headers:this.hd()});if(!r.ok)throw new Error('delete guest '+r.status)}catch(e){throw e instanceof Error&&/delete guest/.test(e.message)?e:new Error('delete guest '+id+': '+(e.message||'network'))}},
  // ===== 💐 Finished ledger — three redundant cloud copies (HD0.6) =====
  // Copy 1: Storage object site-ledger/finished_people.json (survives every table wipe)
  async sbGetFinishedJson(){try{const u=`${SUPABASE_URL}/storage/v1/object/public/${FINISHED_BUCKET}/${FINISHED_FILE}?cb=${Date.now()}`;const r=await fetch(u,{cache:'no-store'});if(!r.ok)return null;return await r.text()}catch(e){return null}},
  async sbPutFinishedJson(text){try{const u=`${SUPABASE_URL}/storage/v1/object/${FINISHED_BUCKET}/${FINISHED_FILE}`;const r=await fetch(u,{method:'POST',headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY,'Content-Type':'application/json','x-upsert':'true'},body:text});return r.ok}catch(e){return false}},
  // Copy 2: settings row key='shared__finished_ledger' (works even if bucket/RLS was never created)
  async sbGetFinishedFromSettings(){try{const gs=await this.getSet(null);const v=gs&&gs[FINISHED_LEDGER_SETTING];return (v&&String(v).length>2)?String(v):null}catch(e){return null}},
  async sbPutFinishedToSettings(text){
    try{await this.upSet({[FINISHED_LEDGER_SETTING]:text},null);return true}
    catch(e){
      // PATCH fallback, then INSERT fallback
      try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_SETTINGS}?key=eq.${FINISHED_LEDGER_SETTING}&person_id=is.null`,{method:'PATCH',headers:this.h(),body:JSON.stringify({value:text})});if(r.ok)return true}catch(e2){}
      try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_SETTINGS}`,{method:'POST',headers:this.h(),body:JSON.stringify({key:FINISHED_LEDGER_SETTING,value:text,person_id:null})});return r.ok}catch(e3){return false}
    }
  },
  // Copy 3: public.finished_ledger single-row table (id=1) — permanent home, guarded above
  async sbGetFinishedFromTable(){try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_LEDGER}?select=value&id=eq.1`,{headers:this.h(),cache:'no-store'});if(!r.ok)return null;const rows=await r.json();return (rows&&rows[0]&&rows[0].value!=null)?String(rows[0].value):null}catch(e){return null}},
  async sbPutFinishedToTable(text){try{await sbEnsureLedgerTable();const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_LEDGER}?id=eq.1`,{method:'PATCH',headers:this.h(),body:JSON.stringify({value:text,updated_at:new Date().toISOString()})});if(r.ok)return true;const r2=await fetch(`${SUPABASE_URL}/rest/v1/${T_LEDGER}`,{method:'POST',headers:Object.assign({},this.h(),{'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({id:1,value:text})});return r2.ok}catch(e){return false}},
  async guests(){try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_GUEST}?select=*&order=created_at.desc`,{headers:this.h(),cache:'no-store'});if(!r.ok)return[];return r.json()}catch(e){return[]}},
  async updGuest(id,patch){return this.upd(T_GUEST,id,patch)},
  async wipeExpired(){try{const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/wipe_expired_people`,{method:'POST',headers:this.h(),body:'{}'});if(!r.ok)return 0;const n=await r.json();return n||0}catch(e){return 0}},
  async reviews(){try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_REVIEWS}?select=*&order=created_at.desc`,{headers:this.h(),cache:'no-store'});if(!r.ok)return[];return r.json()}catch(e){return[]}},
  async upsertReview(row){
    const slug=(row.person_slug||'').toLowerCase();
    let existing=[];
    try{
      const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_REVIEWS}?select=id&person_slug=ilike.${encodeURIComponent(slug)}`,{headers:this.h(),cache:'no-store'});
      if(r.ok)existing=await r.json();
    }catch(e){}
    if(existing&&existing[0])return this.upd(T_REVIEWS,existing[0].id,row);
    return this.insBatch(T_REVIEWS,[row]);
  },
  async delReview(id){await fetch(`${SUPABASE_URL}/rest/v1/${T_REVIEWS}?id=eq.${id}`,{method:'DELETE',headers:this.hd()})}
};

async function wipeOnePerson(pid){
  if(!pid)return;
  try{
    await Promise.all([
      sb.wipe(T_MEDIA,pid),sb.wipe(T_GIFTS,pid),sb.wipe(T_STORY,pid),
      sb.wipe(T_EVENTS,pid),sb.wipe(T_VOICE,pid),sb.wipe(T_VIDEO,pid),
      sb.wipe(T_PINS,pid),sb.wipe(T_UPLOADS,pid),sb.wipe(T_SETTINGS,pid)
    ]);
    await sb.delPerson(pid);
  }catch(e){console.warn('[wipe] failed for '+pid,e.message)}
}
async function checkWipe(){
  try{
    await sb.wipeExpired();
    const all=await sb.people()||[];
    // HD1.1: pull the cloud ledger + seed due-but-still-present people before repainting
    try{ await pullFinishedLedger(); }catch(e){}
    const nowMs=Date.now();
    let finishedChanged=false;
    // ===== HD1.2 — AUTO-MOVE TO FINISHED =====
    // When a person's scheduled auto-wipe date & time passes, they are moved onto the
    // 💐 Finished ledger automatically and appear on the home screen 💐 Finished section
    // (and in the admin 💐 Finished tab) without any admin action.
    // People already deleted from `people` by the server-side wipe_expired_people RPC are
    // recovered from their linked guest submission rows so nothing is ever missed.
    let gRows=null;
    const slugOfRow=r=>{const pl=r.payload||{};const prop=pl.person_proposal||{};return String(r.approved_login_id||prop.slug||r.target_person_slug||'').toLowerCase()};
    const duePeople=all.filter(p=>{
      if(!p.wipe_iso)return false;
      const d=new Date(p.wipe_iso);
      return !isNaN(d.getTime())&&d.getTime()<=nowMs;
    });
    duePeople.forEach(p=>{
      if(!p.slug)return;
      if(isFinishedSlug(p.slug)||isPurged(p.slug))return;
      if(addFinishedPerson({slug:String(p.slug),display_name:p.display_name,birthday:p.birthday||null,
        requester_name:p.requester_name||'',requester_relation:p.requester_relation||'',requester_whatsapp:p.requester_whatsapp||'',
        finished_manually:false,wiped_at:p.wipe_iso}))finishedChanged=true;
    });
    try{
      gRows=(await sb.guests())||[];
      const liveSlugs={};all.forEach(p=>{if(p.slug)liveSlugs[String(p.slug).toLowerCase()]=true});
      gRows.filter(r=>r.status==='approved').forEach(r=>{
        const s=slugOfRow(r);
        if(!s||liveSlugs[s])return;                       // still live → handled above
        if(isFinishedSlug(s)||isPurged(s))return;         // already finished or tombstoned
        const pl=r.payload||{};const prop=pl.person_proposal||{};const gi=pl.guest_info||{};
        const w=r.wipe_iso||prop.wipe_iso||null;          // scheduled "said" date/time (R4)
        if(!w)return;
        const d=new Date(w);
        if(isNaN(d.getTime())||d.getTime()>nowMs)return;  // auto-wipe not due yet
        if(addFinishedPerson({id:r.id,slug:s,
          display_name:prop.display_name||r.target_person_slug||s,
          birthday:prop.birthday||null,
          requester_name:gi.name||r.guest_name||'',
          requester_relation:gi.relation||'',
          requester_whatsapp:gi.whatsapp||r.guest_whatsapp||'', // kept PRIVATE (R7)
          finished_manually:false,wiped_at:w}))finishedChanged=true;
        sb.updGuest(r.id,{status:'finished'}).catch(()=>{}); // R11: leaves ✅ Completed, enters 💐 Finished
      });
    }catch(e){}
    // HD1.2: auto-move every DUE-but-not-yet-finished approved row onto the ledger and flip it
    // to status='finished' BEFORE wiping — so nobody can slip through between the two passes.
    const finishRow=r=>{
      const s=slugOfRow(r);if(!s)return false;
      if(isFinishedSlug(s)||isPurged(s))return false;
      const pl=r.payload||{};const prop=pl.person_proposal||{};const gi=pl.guest_info||{};
      const person=(S.PEOPLE||[]).find(p=>p.id===r.approved_person_id)||(S.PEOPLE||[]).find(p=>String(p.slug||'').toLowerCase()===s);
      let w=person&&person.wipe_iso?person.wipe_iso:(r.wipe_iso||prop.wipe_iso||null);
      if(!w){const d0=new Date();w=d0.toISOString()}
      const d=new Date(w);
      if(isNaN(d.getTime())||d.getTime()>nowMs)return false;   // not due yet
      const added=addFinishedPerson({id:r.id,slug:s,
        display_name:(person&&person.display_name)||prop.display_name||r.target_person_slug||s,
        birthday:(person&&person.birthday)||prop.birthday||null,
        requester_name:(person&&person.requester_name)||gi.name||r.guest_name||'',
        requester_relation:gi.relation||'',
        requester_whatsapp:(person&&person.requester_whatsapp)||gi.whatsapp||r.guest_whatsapp||'', // kept PRIVATE (R7)
        finished_manually:false,wiped_at:w});
      if(added)finishedChanged=true;
      sb.updGuest(r.id,{status:'finished'}).catch(()=>{});       // R11
      return true;
    };
    try{
      const aRows=gRows||((await sb.guests())||[]);
      aRows.filter(r=>r.status==='approved').forEach(finishRow);
    }catch(e){}
    // Client-side safety net: wipe expired card data even if the RPC was never installed.
    if(duePeople.length)for(const p of duePeople)await wipeOnePerson(p.id);
    S.PEOPLE=await sb.people()||[];
    // Final sweep: any live person still past their wipe date lands on the ledger too.
    (S.PEOPLE||[]).forEach(p=>{
      if(!p.slug||!p.wipe_iso)return;
      const d=new Date(p.wipe_iso);
      if(isNaN(d.getTime())||d.getTime()>nowMs)return;
      if(isFinishedSlug(p.slug)||isPurged(p.slug))return;
      if(addFinishedPerson({slug:String(p.slug),display_name:p.display_name,birthday:p.birthday||null,
        requester_name:p.requester_name||'',requester_relation:'',requester_whatsapp:p.requester_whatsapp||'',
        finished_manually:false,wiped_at:p.wipe_iso}))finishedChanged=true;
    });
    try{ if(await syncFinishedFromCloud())finishedChanged=true; }catch(e){}
    if(finishedChanged){ try{ await pullFinishedLedger(); }catch(e){} } // propagate to all devices/domains
    if(window.buildHome)window.buildHome();                              // repaints 💐 Finished section too
    if(window.updateFinishedBadge)updateFinishedBadge();
    if($('guestCompletedSection')&&$('guestCompletedSection').style.display!=='none')loadGuestHistory();
    if($('guestFinishedSection')&&$('guestFinishedSection').style.display!=='none')loadAdminFinished();
  }catch(e){}
}

const FW_COLORS=['#8b0028','#c41e3a','#ffd700','#ffed4e','#d4a373','#ffe0e6','#ff69b4','#ff8a3d','#2a5fd1','#9d4edd'];
function fireworksBurst(x,y){
  if(getShared('enableFireworks','true')!=='true')return;
  for(let i=0;i<26;i++){
    const p=document.createElement('div');p.className='firework';
    p.style.left=x+'px';p.style.top=y+'px';
    p.style.backgroundColor=FW_COLORS[Math.floor(Math.random()*FW_COLORS.length)];
    const a=(i/26)*Math.PI*2+Math.random()*0.3;
    const d=60+Math.random()*120;
    p.style.setProperty('--tx',Math.cos(a)*d+'px');
    p.style.setProperty('--ty',Math.sin(a)*d+'px');
    p.style.animationDuration=(0.9+Math.random()*0.7)+'s';
    document.body.appendChild(p);setTimeout(()=>p.remove(),1700);
  }
}
document.addEventListener('click',(e)=>{
  const t=e.target;
  if(t.closest('button, a, input, textarea, select, .gift-box, .modal, .panel-modal, .pw-modal, .lock-screen, .opening-screen, .cake-clickable, .home-screen, .info-modal, .slideshow-overlay, .lang-mini-tabs, .person-card'))return;
  fireworksBurst(e.clientX,e.clientY);
});
window.__showToast=function(msg,ok){
  const t=$('globalToast');if(!t)return;
  t.textContent=msg||'';
  t.style.background=ok===false?'rgba(196,30,58,.95)':'rgba(10,122,61,.95)';
  // always keep the toast on top of every panel / modal (v2.9)
  t.style.zIndex='2147483000';
  t.classList.add('show');clearTimeout(t._tt);
  t._tt=setTimeout(()=>t.classList.remove('show'),2400);
};
/* Native alert/confirm/prompt can be painted *behind* a full-screen admin panel
   and they freeze the script — replace them with in-page popups that always sit
   above the panel. They return promises, so call-sites use `await`. */
window.alert=function(msg){ return window.__syncAlert(msg,'info'); };
window.confirm=function(msg){ return window.__syncConfirm(msg,{kind:'warn'}); };
window.prompt=function(msg,val){ return window.__syncPrompt(msg,val); };

let homeClickCount=0;let homeClickTimer=null;
(function wireTripleClick(){
  const el=$('homeEmoji');if(!el)return;
  el.addEventListener('click',()=>{
    homeClickCount++;
    if(homeClickTimer)clearTimeout(homeClickTimer);
    if(homeClickCount>=3){ homeClickCount=0; triggerAdminPrompt(); return; }
    homeClickTimer=setTimeout(()=>{homeClickCount=0},600);
  });
})();
async function triggerAdminPrompt(){
  const gs=await sb.getSet(null);
  const flag=(gs&&gs['shared__adminLoginEnabled']);
  const enabled = (flag===undefined) ? true : (String(flag)==='true');
  if(!enabled){ return; }
  openAdminLoginFull();
}
window.buildHome=function(){
  const g=$('homeGrid');if(!g)return;g.innerHTML='';
  // R3: finished people are removed from the Active grid immediately (homeVisiblePeople filter)
  const ep=window.homeVisiblePeople();
  ep.forEach(p=>{
    const b=document.createElement('button');b.type='button';b.className='home-btn';
    b.innerHTML=`<span class="home-btn-emoji">💝</span><span>${(p.display_name||p.slug||'Person').replace(/</g,'&lt;')}</span>`;
    b.onclick=()=>onPersonClick(p);g.appendChild(b);
  });
  const gb=document.createElement('button');gb.type='button';gb.className='home-btn guest';
  gb.innerHTML='<span class="home-btn-emoji">✍️</span><span>Guest</span>';gb.onclick=()=>window.openGuestPanel&&window.openGuestPanel();g.appendChild(gb);
  renderHomeReviews();
  if(window.renderFinishedSection)window.renderFinishedSection();
};
function starsHtml(n){let s='';for(let i=1;i<=5;i++)s+=`<span style="color:${i<=n?'#ffb703':'#ddd'};">★</span>`;return s;}
function renderHomeReviews(){
  const wrap=$('homeReviews'),list=$('homeReviewsList'),moreWrap=$('homeReviewsMore');
  if(!wrap||!list)return;
  const revs=S.REVIEWS||[];
  if(!revs.length){wrap.style.display='none';return}
  wrap.style.display='block';
  const lim=S.HOME_REVIEW_LIMIT;
  const shown=revs.slice(0,lim);
  list.innerHTML=shown.map(r=>{
    const stars=Math.max(1,Math.min(5,parseInt(r.stars)||0));
    const personLabel=(r.person_name||r.person_slug||'');
    const personId=r.person_slug?('#'+r.person_slug):'';
    const req=r.requester_name||'Admin';
    const date=r.created_at?new Date(r.created_at).toLocaleDateString():'';
    return `<div class="hr-item">
      <div class="hr-stars">${starsHtml(stars)}</div>
      <div class="hr-line"><strong>Person:</strong> ${(personLabel||'').replace(/</g,'&lt;')} ${personId?('<span style="opacity:.7;font-family:monospace;font-size:.75rem;">'+personId.replace(/</g,'&lt;')+'</span>'):''}</div>
      <div class="hr-line"><strong>Requested by:</strong> ${String(req).replace(/</g,'&lt;')}</div>
      <div class="hr-msg">"${String(r.message||'').replace(/</g,'&lt;')}"</div>
      <div class="hr-meta">${date?date:''}</div>
    </div>`;
  }).join('');
  moreWrap.style.display=(revs.length>lim)?'block':'none';
}
$('homeReviewsMoreBtn').onclick=()=>{ S.HOME_REVIEW_LIMIT+=10; renderHomeReviews(); };
(function wireHomeIntro(){
  const box=$('homeIntro');
  const btn=$('homeIntroToggle');
  if(!box||!btn)return;
  const KEY='homeIntroCollapsed';
  try{
    if(localStorage.getItem(KEY)==='1'){ box.classList.add('collapsed'); btn.textContent='Show more 👇'; }
  }catch(e){}
  btn.onclick=()=>{
    const isCollapsed=box.classList.toggle('collapsed');
    btn.textContent=isCollapsed?'Show more 👇':'Hide 👆';
    try{ localStorage.setItem(KEY,isCollapsed?'1':'0'); }catch(e){}
  };
})();

async function loadReviews(){
  S.REVIEWS=await sb.reviews()||[];
  renderHomeReviews();
  if(S.ADMIN_MODE)renderAdminReviews();
}
function hasReviewFor(slug){
  if(!slug)return false;
  const low=slug.toLowerCase();
  return (S.REVIEWS||[]).some(r=>r.person_slug&&r.person_slug.toLowerCase()===low);
}

function onPersonClick(p){
  S.LOGIN_TARGET=p;
  txt($('personLoginTitle'),'Hi '+(p.display_name||p.slug||'')+' 💕');
  txt($('personLoginSub'),"Enter your View Key, or the requester's Edit Key.");
  $('personPwError').classList.remove('show');$('personPwInput').value='';
  show($('personLoginModal'));setTimeout(()=>$('personPwInput').focus(),150);
}
$('personPwCancel').onclick=()=>hide($('personLoginModal'));
$('personPwInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();tryPersonPw()}});
$('personPwConfirm').onclick=tryPersonPw;

async function tryPersonPw(){
  const pw=$('personPwInput').value;const p=S.LOGIN_TARGET;if(!p)return;
  const adminPw=(S.CURR.shared&&S.CURR.shared.adminPassword)||FALLBACK_ADMIN_PW;
  if(pw===adminPw||pw===FALLBACK_ADMIN_PW){hide($('personLoginModal'));await window.startAdmin();return}
  const editPw=getEditPasswordForPerson(p);
  const isRequester = editPw && pw===editPw;
  // View Keys are stored as short unique 8-char keys (same rules as Edit Keys).
  // Legacy long-format keys still work for existing people until they are re-saved.
  const expected=normalizeViewPw(p.password)||String(p.password||'');
  const entered=String(pw||'');
  const isViewer = expected ? (entered===expected || entered.toUpperCase()===expected) : false;
  if(!isRequester && !isViewer){
    $('personPwError').textContent=getText('pwError','❌ Incorrect password.');
    $('personPwError').classList.add('show');return;
  }
  hide($('personLoginModal'));
  S.REQUESTER_MODE=isRequester;
  await loadPersonIntoState(p);
  const s=S.CURR.shared||{};
  const unlockIso=s.unlockDateISO||'';
  const showLock=s.showLockScreen==='true';
  const now=new Date();
  const unlockDate=unlockIso?new Date(unlockIso):null;
  const locked=unlockDate&&!isNaN(unlockDate)&&now<unlockDate;
  $('homeScreen').classList.add('hidden');
  if(locked||showLock){
    renderLockFull();show($('lockScreen'));
    // FIX 7: when lock screen is force-shown AFTER unlock (showLockScreen=true),
    // hide the countdown row + Open Early button entirely — nothing left to count down.
    const cdRow=$('cdDays')&&$('cdDays').closest('.countdown');
    if(cdRow)cdRow.style.display=locked?'':'none';
    $('countdownLabelEl').style.display=locked?'':'none';
    const oeBtn=$('openEarlyBtn');if(oeBtn)oeBtn.style.display=locked?'':'none';
    if(locked)startCountdownFull(unlockDate);else txt($('countdownLabelEl'),'');
    return;
  }
  openOpeningFull();
}

function renderLockFull(){
  txt($('lockTitleEl'),getText('lockTitle','The surprise is locked'));
  $('lockSubtitleEl').innerHTML=(getText('lockSubtitle','')||'')+(getText('lockDateText','')?('<br><strong>'+getText('lockDateText','')+'</strong>'):'');
  txt($('countdownLabelEl'),getText('countdownLabel','Unlocks in'));
  txt($('cdDaysLabel'),getText('daysLabel','Days'));
  txt($('cdHoursLabel'),getText('hoursLabel','Hours'));
  txt($('cdMinsLabel'),getText('minsLabel','Mins'));
  txt($('cdSecsLabel'),getText('secsLabel','Secs'));
  txt($('openEarlyTextEl'),getText('openEarlyText','Open Early'));
}
let CD_T=null;
function startCountdownFull(unlockDate){
  clearInterval(CD_T);
  // FIX 7: re-show countdown row + Open Early when a real countdown starts
  // (they may have been hidden by a previous showLockScreen-only display).
  const cdRow=$('cdDays')&&$('cdDays').closest('.countdown');
  if(cdRow)cdRow.style.display='';
  $('countdownLabelEl').style.display='';
  const oeBtn=$('openEarlyBtn');if(oeBtn)oeBtn.style.display='';
  function tick(){
    const diff=unlockDate-new Date();
    if(diff<=0){clearInterval(CD_T);['cdDays','cdHours','cdMins','cdSecs'].forEach(id=>$(id).textContent='00');return}
    const ts=Math.floor(diff/1000);
    $('cdDays').textContent=String(Math.floor(ts/86400)).padStart(2,'0');
    $('cdHours').textContent=String(Math.floor((ts%86400)/3600)).padStart(2,'0');
    $('cdMins').textContent=String(Math.floor((ts%3600)/60)).padStart(2,'0');
    $('cdSecs').textContent=String(ts%60).padStart(2,'0');
  }
  tick();CD_T=setInterval(tick,1000);
}
// FIX 7: explicit timer cleanup — called on lock-screen dismiss & card close (spec §5.6)
function stopCountdownFull(){ if(CD_T){clearInterval(CD_T);CD_T=null;} }
window.stopCountdownFull=stopCountdownFull;
$('openEarlyBtn').onclick=async()=>{
  const unlockIso=(S.CURR.shared||{}).unlockDateISO||'';
  const unlockDate=unlockIso?new Date(unlockIso):null;
  const locked=unlockDate&&!isNaN(unlockDate)&&new Date()<unlockDate;
  if(locked){ const tpl=getText('pwLockedMsg','🔒 This surprise unlocks on {date}. Please come back then.'); await alert(tpl.replace('{date}',unlockDate.toLocaleString())); return; }
  stopCountdownFull();hide($('lockScreen'));openOpeningFull();
};

function openOpeningFull(){
  txt($('openLine1El'),getText('openLine1','A special day…'));
  txt($('openLine2El'),getText('openLine2','Happy Birthday!'));
  txt($('cakeHintEl'),getText('cakeHint','Tap the cake to open 💕'));
  hide($('viewerScreen'));S.CARD_STARTED=false;
  $('openingScreen').classList.remove('hidden');show($('openingScreen'));
}
$('cakeClickable').onclick=async()=>{
  $('openingScreen').classList.add('hidden');
  setTimeout(()=>hide($('openingScreen')),800);
  if(!S.CURRENT_PERSON)return;
  showViewerFor(S.CURRENT_PERSON,true);
};

async function showViewerFor(person,startNow){
  if(!S.CURRENT_PERSON||S.CURRENT_PERSON.id!==person.id){
    await loadPersonIntoState(person);
  }
  $('homeScreen').classList.add('hidden');
  show($('viewerScreen'));
  $('viewerPreviewTag').style.display=S.PREVIEW_MODE?'inline-block':'none';
  $('viewerEditCardBtn').classList.toggle('visible',!!S.REQUESTER_MODE&&!S.PREVIEW_MODE);
  $('musicToggle').classList.toggle('visible',buildPlaylistFor('card').length>0);
  $('langToggle').classList.toggle('visible',true);
  const lt=$('langToggle');
  if(lt){lt.textContent=S.CURR_LANG==='en'?'EN':(S.CURR_LANG==='gu'?'ગુ':'हि');lt.dataset.state=S.CURR_LANG;}
  renderCardFull();
  if(startNow)startCard();
  window.scrollTo(0,0);
}
window.__showViewerForPreview__=showViewerFor;
function startCard(){
  if(S.CARD_STARTED)return;
  S.CARD_STARTED=true;
  restartTypewriter();
  updateCounters();
  // FIX 6b: card music starts ONLY if the admin selected at least one song for
  // 'Card' (or 'Both'). Slideshow-only songs must never be heard here.
  if(musicAllowedInCtx('card')) startMusicFor('card');
  else { const a=$('audioPlayer'); if(a&&!a.paused)a.pause(); MUSIC_ON=false; }
}
function renderCardFull(){
  const t=S.CURR.texts||{},s=S.CURR.shared||{};
  document.body.setAttribute('data-theme',s.theme||'romantic');
  document.title=t.pageTitle||'A surprise awaits 💕';
  txt($('mainHeadlineEl'),t.mainHeadline||'Happy Celebration!');
  $('subheadEl').innerHTML=(t.subhead1||'')+(t.subhead2?('<br>'+t.subhead2):'');
  txt($('typeGreeting'),'');
  txt($('namesBadgeEl'),t.namesBadge||'');
  txt($('fromLabel'),t.fromLabel||'Lots of love from');
  txt($('openMemoriesBtnTextEl'),t.openMemoriesBtn||'Open Memories');
  txt($('openPrivateMemoriesBtnTextEl'),t.openPrivateMemoriesBtn||'Open Our Private Memories');
  // Private button is hidden until the card is approved/live AND has at least one APPROVED private media row.
  const privRows=(S.CURR.media||[]).filter(r=>isPrivateRow(r)&&(r.approved===undefined||r.approved===null?true:r.approved!==false));
  $('privateBtn').style.display=(S.CURRENT_PERSON&&S.CURRENT_PERSON.enabled!==false&&privRows.length)?'inline-flex':'none';
  txt($('storyBtnTextEl'),t.storyBtnText||'Our Story');
  txt($('mapBtnTextEl'),t.mapBtnText||'Map of Memories');
  txt($('uploadBtnTextEl'),t.uploadBtnText||'Share Photo');
  txt($('voiceBtnTextEl'),t.voiceBtnText||'Play Voice Message');
  txt($('videoBtnTextEl'),t.videoBtnText||'Play Video Message');
  txt($('countersMainTitle'),t.countersTitle||'Our journey so far');
  COUNTERS.forEach(c=>{
    // FIX 1: label reads only from shared (Lock tab), not from texts
    const label=s[c.labelKey]||'';
    txt($(c.mainLabel),label);
    txt($(c.mainDate),s[c.dispKey]||'');
    const on=String(s[c.showKey])!=='false';
    $(c.mainRow).classList.toggle('counter-hidden',!on);
  });
  const anyVisible=COUNTERS.some(c=>String(s[c.showKey])!=='false');
  $('countersMain').classList.toggle('hidden-box',!anyVisible);
  $('storyBtn').style.display=(s.enableStory==='true'&&S.CURR.story.length)?'inline-flex':'none';
  $('mapBtn').style.display=(s.enableMap==='true'&&S.CURR.pins.length)?'inline-flex':'none';
  $('uploadBtn').style.display=(s.enableUpload==='true')?'inline-flex':'none';
  $('voiceRow').style.display=(s.enableVoiceMsg==='true'&&S.CURR.voice.length)?'flex':'none';
  $('videoMsgRow').style.display=(s.enableVideoMsg==='true'&&S.CURR.video.length)?'flex':'none';
  renderGifts();renderEvents();updateCounters();
}

let TW_TIMERS=[],TW_STARTED=false,TW_DONE=false,TW_ABORT=false;
function clearTW(){while(TW_TIMERS.length)clearTimeout(TW_TIMERS.pop())}
function graphemes(str){try{const seg=new Intl.Segmenter('en',{granularity:'grapheme'});return Array.from(seg.segment(str),x=>x.segment)}catch(e){return Array.from(str)}}
function restartTypewriter(){
  TW_STARTED=false;TW_DONE=false;TW_ABORT=false;clearTW();
  const g=$('typeGreeting');if(g)g.textContent='';
  document.querySelectorAll('.type-para').forEach(p=>p.textContent='');
  startTypewriter();
}
function startTypewriter(){
  if(TW_STARTED)return;TW_STARTED=true;
  const g=$('typeGreeting');if(!g)return;
  const t=S.CURR.texts||{};
  const gt=t.greeting||'Dear you,';
  g.textContent='';
  const paras=Array.from(document.querySelectorAll('.type-para'));
  const keys=['msg1','msg2','msg3','msg4','msg5','signoff'];
  const queue=[{el:g,text:gt,isG:true}];
  paras.forEach((p,i)=>{p.textContent='';queue.push({el:p,text:t[keys[i]]||'',isG:false})});
  let qi=0;const CD=32;
  const cur=document.createElement('span');cur.className='type-cursor';
  function next(){
    if(TW_ABORT)return;
    if(qi>=queue.length){if(cur.parentNode)cur.remove();TW_DONE=true;return}
    const item=queue[qi];item.el.appendChild(cur);
    const chars=graphemes(item.text);let ci=0;
    function step(){
      if(TW_ABORT)return;
      if(ci<chars.length){cur.insertAdjacentText('beforebegin',chars[ci]);ci++;TW_TIMERS.push(setTimeout(step,CD))}
      else{cur.remove();qi++;TW_TIMERS.push(setTimeout(next,item.isG?500:350))}
    }
    step();
  }
  next();
}

function updateCounters(){
  const s=S.CURR.shared||{};
  const last=window.__counterLast__||(window.__counterLast__={});
  const fmt=(iso,key)=>{
    if(!iso)return'—';
    const d=new Date(iso);if(isNaN(d.getTime()))return'—';
    const diff=Date.now()-d.getTime();
    if(diff<0)return'Just started 💕';
    const sec=Math.floor(diff/1000);
    // PERF (spec §5.7): unchanged second → skip DOM write entirely
    if(last[key]===sec)return null;
    last[key]=sec;
    const days=Math.floor(sec/86400),hrs=Math.floor((sec%86400)/3600),mins=Math.floor((sec%3600)/60),ss=sec%60;
    return `<strong>${days}</strong> d <strong>${hrs}</strong> h <strong>${mins}</strong> m <strong>${ss}</strong> s`;
  };
  const set=(el,html)=>{ if(el&&html!=null)el.innerHTML=html };
  set($('counterTalkMain'),fmt(s.ct1_datetime,'ct1'));
  set($('counterYesMain'),fmt(s.ct2_datetime,'ct2'));
  set($('counterEngagedMain'),fmt(s.ct3_datetime,'ct3'));
}
// PERF (spec §5.7): interval runs ONLY while #viewerScreen is active AND tab visible.
// Started/stopped via visibilitychange + MutationObserver on the viewer's class list.
(function(){
  let running=false;
  function shouldRun(){
    const v=$('viewerScreen');
    return !!(v&&v.classList.contains('active'))&&!document.hidden;
  }
  function stop(){ if(running){clearInterval(window.__counterInterval);window.__counterInterval=null;running=false;} }
  function sync(){
    if(shouldRun()){
      if(!running){ window.updateCounters?window.updateCounters():updateCounters(); window.__counterInterval=setInterval(tick,1000); running=true; }
    } else stop();
  }
  function tick(){ if(document.hidden){stop();return;} updateCounters(); }
  document.addEventListener('visibilitychange',sync);
  function init(){
    const v=$('viewerScreen');
    if(v&&window.MutationObserver){ new MutationObserver(sync).observe(v,{attributes:true,attributeFilter:['class']}); }
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

function renderGifts(){
  const w=$('giftRow'),sec=$('giftSection');
  const gifts=S.CURR.gifts||[];const s=S.CURR.shared||{};
  if(s.enableGiftBox!=='true'||!gifts.length){sec.style.display='none';return}
  sec.style.display='block';
  txt($('giftSectionTitleEl'),(S.CURR.texts||{}).giftSectionTitle||'Tap a gift 💝');
  w.innerHTML='';
  gifts.forEach(g=>{
    const d=document.createElement('div');d.className='gift-box';
    d.innerHTML=`<div class="gift-emoji">${g.emoji||'🎁'}</div><div class="gift-label">${(g.title||'Open me!').replace(/</g,'&lt;')}</div>`;
    d.onclick=()=>openGift(g);w.appendChild(d);
  });
}

function buildMiniSlideshow(container,ids,durationMs){
  if(!container)return null;
  const list=(ids||[]).filter(Boolean);
  if(!list.length)return null;
  durationMs=durationMs||MODAL_IMG_DURATION_MS;
  container.innerHTML='';
  container.classList.add('mini-slide-wrap');
  const img=document.createElement('img');
  img.className='mini-slide-img';
  img.loading='lazy';
  img.src=driveImg(list[0],2400);
  img.onerror=()=>{img.src='https://drive.google.com/thumbnail?id='+list[0]+'&sz=w2400';};
  container.appendChild(img);

  const counter=document.createElement('div');
  counter.className='mini-slide-counter';
  container.appendChild(counter);

  const prog=document.createElement('div');
  prog.className='mini-slide-progress';
  container.appendChild(prog);

  let dots=null;
  if(list.length>1){
    dots=document.createElement('div');
    dots.className='mini-slide-dots';
    list.forEach((_,i)=>{const d=document.createElement('span');d.className='dot';d.onclick=()=>{idx=i;render();};dots.appendChild(d);});
    container.appendChild(dots);
    const prev=document.createElement('button');prev.type='button';prev.className='mini-slide-nav prev';prev.textContent='❮';
    const next=document.createElement('button');next.type='button';next.className='mini-slide-nav next';next.textContent='❯';
    container.appendChild(prev);container.appendChild(next);
    prev.onclick=(e)=>{e.stopPropagation();idx=(idx-1+list.length)%list.length;render();};
    next.onclick=(e)=>{e.stopPropagation();idx=(idx+1)%list.length;render();};
  }

  let idx=0;let timer=null;
  function render(){
    img.style.opacity='0';
    setTimeout(()=>{
      img.src=driveImg(list[idx],2400);
      img.onerror=()=>{img.src='https://drive.google.com/thumbnail?id='+list[idx]+'&sz=w2400';};
      img.style.opacity='1';
    },160);
    counter.textContent=(idx+1)+' / '+list.length;
    if(dots)dots.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('active',i===idx));
    prog.style.transition='none';prog.style.width='0%';
    if(list.length>1){
      void prog.offsetWidth;
      prog.style.transition='width '+durationMs+'ms linear';
      prog.style.width='100%';
      if(timer)clearTimeout(timer);
      timer=setTimeout(()=>{idx=(idx+1)%list.length;render();},durationMs);
    }
  }
  function start(){ render(); }
  function stop(){ if(timer){clearTimeout(timer);timer=null;} }
  start();
  return {stop};
}

function openGift(g){
  const m=document.createElement('div');m.className='info-modal active';
  let h='<div class="info-content"><button class="info-close" id="gmClose">✕</button>';
  h+='<div class="info-title">'+(g.title||'').replace(/</g,'&lt;')+'</div>';
  h+='<div id="giftSlideWrap"></div>';
  if(g.message)h+='<p style="font-size:1rem;line-height:1.6;color:var(--c-text);font-style:italic;">'+g.message.replace(/</g,'&lt;')+'</p>';
  h+='</div>';m.innerHTML=h;document.body.appendChild(m);
  const ids=splitDriveIds(g.photo_drive_id);
  let mini=null;
  if(ids.length){
    mini=buildMiniSlideshow(m.querySelector('#giftSlideWrap'),ids,MODAL_IMG_DURATION_MS);
  }
  m.querySelector('#gmClose').onclick=()=>{ if(mini)mini.stop(); m.remove(); };
}

let EV_T=null;
function renderEvents(){
  const sec=$('eventSection'),w=$('eventRow');
  const ev=S.CURR.events||[];const s=S.CURR.shared||{};
  if(s.enableEventCount!=='true'||!ev.length){sec.style.display='none';return}
  sec.style.display='block';
  txt($('eventSectionTitleEl'),(S.CURR.texts||{}).eventSectionTitle||'Coming up');
  function tick(){
    w.innerHTML=ev.map(e=>{
      const t=new Date(e.target_iso);if(isNaN(t.getTime()))return'';
      const d=t-Date.now();
      if(d<=0)return`<div class="event-row"><div class="event-icon">${e.icon||'📅'}</div><div class="event-body"><div class="event-label">${(e.label||'').replace(/</g,'&lt;')}</div><div class="event-time">🎉 Today!</div></div></div>`;
      const days=Math.floor(d/86400000),hrs=Math.floor((d%86400000)/3600000),mins=Math.floor((d%3600000)/60000);
      return`<div class="event-row"><div class="event-icon">${e.icon||'📅'}</div><div class="event-body"><div class="event-label">${(e.label||'').replace(/</g,'&lt;')}</div><div class="event-time"><strong>${days}</strong>d <strong>${hrs}</strong>h <strong>${mins}</strong>m</div></div></div>`;
    }).join('');
  }
  tick();
  if(EV_T)clearInterval(EV_T);EV_T=setInterval(tick,60000);
}

$('voicePlayBtn').onclick=()=>{
  if(!S.CURR.voice||!S.CURR.voice.length)return;
  const a=$('audioPlayer');
  if(a.src===S.CURR.voice[0].audio_url&&!a.paused){a.pause();return}
  a.src=S.CURR.voice[0].audio_url||'';
  a.volume=parseFloat((S.CURR.shared||{}).vol_card||'0.45')||0.45;
  a.play().catch(()=>{});
};

let VM_CURRENT=null;
$('videoMsgBtn').onclick=()=>{
  if(!S.CURR.video||!S.CURR.video.length)return;
  if(VM_CURRENT){ try{const v=VM_CURRENT.querySelector('video'); if(v){v.pause();v.currentTime=0;v.src='';}}catch(e){} VM_CURRENT.remove(); VM_CURRENT=null; }
  const m=document.createElement('div');
  m.className='info-modal active';
  m.innerHTML=`<div class="info-content vm-modal-content">
    <button class="info-close" id="vmClose">✕</button>
    <div class="info-title">${(S.CURR.video[0].title||'A message').replace(/</g,'&lt;')}</div>
    <video src="${S.CURR.video[0].video_url}" controls playsinline autoplay class="vm-video"></video>
  </div>`;
  document.body.appendChild(m);
  VM_CURRENT=m;
  const vid=m.querySelector('video');
  const closeVM=()=>{
    try{ vid.pause(); vid.currentTime=0; vid.removeAttribute('src'); vid.load(); }catch(e){}
    m.remove();
    if(VM_CURRENT===m)VM_CURRENT=null;
  };
  vid.addEventListener('ended', closeVM);
  vid.addEventListener('error', ()=>{ setTimeout(closeVM,600); });
  m.querySelector('#vmClose').onclick=closeVM;
  m.addEventListener('click',(e)=>{ if(e.target===m)closeVM(); });
  const p=vid.play();
  if(p&&p.catch)p.catch(()=>{ vid.muted=true; vid.play().catch(()=>{}); });
};

let STORY_IDX=0;
let STORY_T=null;
let STORY_AUTOPLAY=false;
let STORY_MINI=null;

function storyDurationMs(){
  const s=S.CURR.shared||{};
  const v=clampDuration(s.storySlideDefaultSec||s.storySlideDuration||'10',10,1,30);
  return v*1000;
}
function renderStoryPage(){
  const viewer=$('storyViewer');if(!viewer)return;
  const pages=S.CURR.story||[];
  if(STORY_MINI){ STORY_MINI.stop(); STORY_MINI=null; }
  if(!pages.length){viewer.innerHTML='<p style="text-align:center;color:var(--c-text-muted);">No story pages yet.</p>';return;}
  const s=pages[STORY_IDX]||{};
  let h='<div class="story-page">';
  h+='<div id="storySlideWrap"></div>';
  if(s.title)h+=`<h3>${s.title.replace(/</g,'&lt;')}</h3>`;
  if(s.body)h+=`<p>${s.body.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</p>`;
  h+='</div>';
  viewer.innerHTML=h;
  const ids=splitDriveIds(s.photo_drive_id);
  if(ids.length){
    STORY_MINI=buildMiniSlideshow(viewer.querySelector('#storySlideWrap'),ids,storyDurationMs());
  }
  txt($('storyPageNum'),(STORY_IDX+1)+' / '+pages.length);
  txt($('storySlideCounter'),'Page '+(STORY_IDX+1)+' / '+pages.length);
  const prog=$('storySlideProgress');
  if(prog){ prog.style.transition='none'; prog.style.width='0%'; }
}
function storyNext(){ const n=(S.CURR.story||[]).length; if(!n)return; STORY_IDX=(STORY_IDX+1)%n; renderStoryPage(); if(STORY_AUTOPLAY){startStoryAutoPlay();} }
function storyPrev(){ const n=(S.CURR.story||[]).length; if(!n)return; STORY_IDX=(STORY_IDX-1+n)%n; renderStoryPage(); if(STORY_AUTOPLAY){startStoryAutoPlay();} }
function startStoryAutoPlay(){
  clearInterval(STORY_T);STORY_T=null;
  if(!STORY_AUTOPLAY)return;
  const dur=storyDurationMs();
  const prog=$('storySlideProgress');
  if(prog){ prog.style.transition='none'; prog.style.width='0%'; void prog.offsetWidth; prog.style.transition='width '+dur+'ms linear'; prog.style.width='100%'; }
  STORY_T=setTimeout(()=>{ if(STORY_AUTOPLAY){ storyNext(); } },dur);
}
$('storyBtn').onclick=()=>{
  STORY_IDX=0;
  STORY_AUTOPLAY=(S.CURR.shared||{}).storySlideshowEnabled==='true';
  const ui=$('storySlideUI'); if(ui)ui.style.display=STORY_AUTOPLAY?'flex':'none';
  renderStoryPage();
  show($('storyModal'));
  startStoryAutoPlay();
};
$('storyNext').onclick=()=>{ storyNext(); if(STORY_AUTOPLAY){startStoryAutoPlay();} };
$('storyPrev').onclick=()=>{ storyPrev(); if(STORY_AUTOPLAY){startStoryAutoPlay();} };
function closeStoryModal(){ clearTimeout(STORY_T);clearInterval(STORY_T);STORY_T=null; if(STORY_MINI){STORY_MINI.stop();STORY_MINI=null;} hide($('storyModal')); }
$('storyClose').onclick=closeStoryModal;
$('storySlidePause').onclick=()=>{
  if(STORY_T){ clearTimeout(STORY_T);clearInterval(STORY_T);STORY_T=null; $('storySlidePause').textContent='▶'; }
  else { startStoryAutoPlay(); $('storySlidePause').textContent='⏸'; }
};
$('storyModal').addEventListener('click',(e)=>{ if(e.target===$('storyModal')){closeStoryModal();} });

function renderMapPins(){
  const canvas=$('mapCanvas');if(!canvas)return;
  const pins=S.CURR.pins||[];
  canvas.innerHTML='';
  const valid=pins.filter(p=>!isNaN(parseFloat(p.lat))&&!isNaN(parseFloat(p.lng)));
  if(!valid.length){ canvas.innerHTML='<div class="map-empty">No memories pinned yet.</div>'; return; }
  const lats=valid.map(p=>parseFloat(p.lat));
  const lngs=valid.map(p=>parseFloat(p.lng));
  const minLat=Math.min(...lats),maxLat=Math.max(...lats);
  const minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
  const spanLat=(maxLat-minLat)||1, spanLng=(maxLng-minLng)||1;
  valid.forEach((p)=>{
    const lat=parseFloat(p.lat),lng=parseFloat(p.lng);
    const x=10+((lng-minLng)/spanLng)*80;
    const y=90-((lat-minLat)/spanLat)*80;
    const pin=document.createElement('div');
    pin.className='map-pin';
    pin.style.left=x+'%';pin.style.top=y+'%';
    pin.textContent='📍';
    pin.title=p.label||'';
    pin.onclick=()=>openPinDetail(p);
    canvas.appendChild(pin);
    if(p.label){
      const lbl=document.createElement('div');
      lbl.className='map-pin-label';
      lbl.style.left=x+'%';lbl.style.top=(y+2)+'%';
      lbl.textContent=p.label;
      canvas.appendChild(lbl);
    }
  });
}

let PIN_MINI=null;
function openPinDetail(p){
  if(PIN_MINI){PIN_MINI.stop();PIN_MINI=null;}
  txt($('pinModalTitle'),p.label||'Memory');
  const v=$('pinModalViewer');
  const ids=splitDriveIds(p.photo_drive_id);
  let h='';
  if(ids.length){ h+='<div id="pinSlideWrap"></div>'; }
  if(p.story)h+=`<p style="font-size:1rem;line-height:1.6;">${p.story.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</p>`;
  v.innerHTML=h||'<p style="text-align:center;color:var(--c-text-muted);">No details.</p>';
  if(ids.length){ PIN_MINI=buildMiniSlideshow(v.querySelector('#pinSlideWrap'),ids,MODAL_IMG_DURATION_MS); }
  show($('pinModal'));
}
$('mapBtn').onclick=()=>{ txt($('mapSelectedName'),''); renderMapPins(); show($('mapModal')); };
$('mapClose').onclick=()=>hide($('mapModal'));
$('mapModal').addEventListener('click',(e)=>{if(e.target===$('mapModal'))hide($('mapModal'))});
function closePinModal(){ if(PIN_MINI){PIN_MINI.stop();PIN_MINI=null;} hide($('pinModal')); }
$('pinModalClose').onclick=closePinModal;
$('pinModal').addEventListener('click',(e)=>{if(e.target===$('pinModal'))closePinModal()});

$('uploadBtn').onclick=()=>{
  $('uploadName').value='';$('uploadDriveId').value='';$('uploadMsg').value='';
  const st=$('uploadStatus');if(st){st.textContent='';st.className='panel-status'}
  show($('uploadModal'));
};
$('uploadClose').onclick=()=>hide($('uploadModal'));
$('uploadModal').addEventListener('click',(e)=>{if(e.target===$('uploadModal'))hide($('uploadModal'))});
$('uploadSubmit').onclick=async()=>{
  const st=$('uploadStatus');
  const name=$('uploadName').value.trim();
  const id=$('uploadDriveId').value.trim();
  const msg=$('uploadMsg').value.trim();
  if(!name){st.textContent='❌ Your name is required.';st.className='panel-status err';return;}
  if(!id){st.textContent='❌ Drive Photo ID is required.';st.className='panel-status err';return;}
  const p=S.CURRENT_PERSON;
  if(!p||!p.id){st.textContent='❌ No person selected.';st.className='panel-status err';return;}
  st.textContent='⏳ Uploading…';st.className='panel-status';
  try{
    await sb.insBatch(T_UPLOADS,[{person_id:p.id,uploader_name:name,drive_id:id,message:msg,status:'pending'}]);
    st.textContent='✅ Submitted for approval!';st.className='panel-status ok';
    setTimeout(()=>hide($('uploadModal')),1200);
  }catch(e){st.textContent='❌ '+e.message;st.className='panel-status err';}
};

let MUSIC_ON=false,CURR_CTX='card',CURR_LIST=[],CURR_IDX=-1;
// FIX 6b: master context switch. Every background-music action (autoplay, toggle
// button, slideshow engine) is gated through these two helpers so a song selected
// for the card can NEVER be heard outside the card and vice-versa.
function musicAllowedInCtx(ctx){ return buildPlaylistFor(ctx).length>0; }
function musicGuard(ctx){ return musicAllowedInCtx(ctx); }
function getVol(ctx){const s=S.CURR.shared||{};if(ctx==='video')return parseFloat(s.vol_video)||1.0;if(ctx==='videomusic')return parseFloat(s.vol_video_music)||0.35;if(ctx==='private')return parseFloat(s.vol_private!==undefined&&s.vol_private!==''?s.vol_private:s.vol_slide)||0.85;if(ctx==='slideshow')return parseFloat(s.vol_slide)||0.85;return parseFloat(s.vol_card)||0.45}
// v2.8: the slideshow engine's actual music context — 'private' when the
// "Open Our Private Memories" slideshow is open, otherwise 'slideshow'.
function SS_musicCtx(){ return (SS_isOpen&&SS_CTX==='private')?'private':'slideshow'; }
// v2.8b ROBUST private-slideshow music: even if the slideshow engine's context flag
// was lost (session restore, reopen race, etc.), whenever a track that is explicitly
// marked 'private' is NOT currently playing and the audio element is idle while the
// slideshow is open, treat the slideshow as the PRIVATE one so its dedicated song plays.
// A normal memories slideshow can never play such a track (buildPlaylistFor('slideshow')
// excludes where='private' songs), so this fallback is safe.
function SS_musicCtxSafe(){
  const mctx=SS_musicCtx();
  if(mctx==='slideshow'&&SS_isOpen){
    const s=S.CURR.shared||{};
    let hasPrivOnly=false;
    for(let i=1;i<=5;i++){
      if(String(s['song'+i+'_on'])==='true'&&(s['song'+i+'_url']||'').trim()&&String(s['song'+i+'_where']||'')==='private'){hasPrivOnly=true;break;}
    }
    if(hasPrivOnly){
      const a=$('audioPlayer');
      const cur=(a&&(a.currentSrc||a.src))||'';
      const privList=buildPlaylistFor('private');
      const playingPriv=privList.length&&cur&&privList.includes(cur)&&a&&!a.paused;
      if(!playingPriv)return 'private';
    }
  }
  return mctx;
}

// v2.8 CONTEXT MAP — every internal music context used by the engine:
//   'card'            -> greeting card background music
//   'slideshow'       -> OUR MEMORIES slideshow (public photos/videos)
//   'private'         -> OPEN OUR PRIVATE MEMORIES slideshow (v2.8 — its own song)
//   'video'/'videomusic' -> volume-only contexts (no playlists)
// UI option values map onto these contexts as follows:
//   Card / Slideshow / Private slideshow / Both / Everywhere (Card + Slideshow) / Any slideshow (Slideshow + Private)
const SS_UI_PLACES=['card','slideshow','private'];
function expandWhere(w){
  w=String(w||'').trim();
  if(!w)return ['card','slideshow','private'];
  if(w==='everywhere')return ['card','slideshow'];
  if(w==='any-slideshow'||w==='anyslideshow')return ['slideshow','private'];
  if(w==='all')return ['card','slideshow','private'];
  // v2.7-compatible value: a song chosen for the normal slideshow also plays in
  // the private slideshow UNLESS the couple set a dedicated private song.
  if(w==='slideshow')return ['slideshow','private'];
  return [w];
}
// Engine context ('card' | 'slideshow' | 'private') -> which UI "Play in" options include it.
const SS_CTX_ACCEPTS={
  card:['card','both','everywhere'],
  slideshow:['slideshow','both','everywhere','any-slideshow','anyslideshow','all'],
  private:['private','slideshow','both','any-slideshow','anyslideshow','all']
};
// FIX 6b: per-song 'where' is the SOLE, AUTHORITATIVE placement selector.
// Whatever the admin picks in the lock panel's "Play in" dropdown for a song is
// exactly where that song plays — nowhere else:
//   song 'card'            -> plays ONLY on the greeting card
//   song 'slideshow'       -> plays in the memories slideshow AND (fallback) the private slideshow
//   song 'private' (v2.8)  -> plays ONLY inside "Open Our Private Memories"
//   song 'both'            -> plays everywhere
// The legacy global 'music_mode' radio is intentionally NOT consulted any more,
// so a saved value of music_mode can never make a song leak into another section.
function songAllowedIn(s,i,ctx){
  const w=s['song'+i+'_where']||'both';
  if(w==='both')return true;
  if((SS_CTX_ACCEPTS[ctx]||[ctx]).indexOf(w)!==-1)return true;
  return expandWhere(w).indexOf(ctx)!==-1;
}
// FIX 5: buildPlaylistFor ignores saved order unless shuffleMusicOn==='true'
function buildPlaylistFor(ctx){
  const s=S.CURR.shared||{};
  const base=[];
  for(let i=1;i<=5;i++){
    const on=String(s['song'+i+'_on'])==='true';
    const url=(s['song'+i+'_url']||'').trim();
    if(!on||!url)continue;
    if(songAllowedIn(s,i,ctx))base.push(url);
  }
  if(String(s.shuffleMusicOn)!=='true')return base;
  const orderStr=(s.musicOrder||'').trim();
  if(orderStr && base.length>1){
    const idxs=orderStr.split(',').map(x=>parseInt(x,10)).filter(x=>!isNaN(x)&&x>=0&&x<base.length);
    if(idxs.length===base.length){
      const seen=new Set();const out=[];
      idxs.forEach(i=>{if(!seen.has(i)){seen.add(i);out.push(base[i])}});
      base.forEach((u,i)=>{if(!seen.has(i))out.push(u)});
      return out;
    }
  }
  return base;
}
function playNext(){
  // FIX 6b: never continue/advance playback into a context where the admin
  // hasn't selected a song for it (e.g. slideshow-only song must stay silent on card).
  if(!musicGuard(CURR_CTX)){ stopMusicEverywhere(); return; }
  if(!CURR_LIST.length)return;
  CURR_IDX=(CURR_IDX+1)%CURR_LIST.length;
  const a=$('audioPlayer');
  a.src=CURR_LIST[CURR_IDX];a.volume=getVol(CURR_CTX);
  a.play().then(()=>{MUSIC_ON=true;$('musicToggle').textContent='🔊'}).catch(()=>{MUSIC_ON=false;$('musicToggle').textContent='🔇'});
}
// FIX 6b: hard stop used whenever music is not allowed in the current context.
function stopMusicEverywhere(){
  const a=$('audioPlayer');
  if(a&&!a.paused)a.pause();
  MUSIC_ON=false;CURR_CTX='';CURR_LIST=[];CURR_IDX=-1;
  SS_ownPlaylist=[];SS_ownIdx=-1;
  const mt=$('musicToggle');if(mt)mt.textContent='🔇';
}
function startMusicFor(ctx){
  const list=buildPlaylistFor(ctx);
  $('musicToggle').classList.toggle('visible',list.length>0);
  if(!list.length){
    // Nothing selected for this place -> make sure nothing plays here and
    // stop anything that was leaking from another place.
    if(CURR_CTX!==ctx||MUSIC_ON){
      const a=$('audioPlayer');
      if(a && !a.paused) a.pause();
      MUSIC_ON=false;
      CURR_CTX=ctx;CURR_LIST=[];CURR_IDX=-1;
      $('musicToggle').textContent='🔇';
    }
    return;
  }
  if(CURR_CTX===ctx&&MUSIC_ON&&!$('audioPlayer').paused)return;
  CURR_CTX=ctx;CURR_LIST=list;CURR_IDX=-1;playNext();
}
$('audioPlayer').addEventListener('ended',()=>{
  if(!MUSIC_ON)return;
  // FIX 6b: track finished — advance within the playlist of the CURRENT place only.
  if(SS_isOpen){
    const mctx=SS_musicCtxSafe(); // v2.8b: 'private' inside Open Our Private Memories
    if(musicAllowedInCtx(mctx)||buildPlaylistFor('private').length){ SS_nextTrackIfOwn(); if(!($('audioPlayer').src&&($('audioPlayer').currentSrc||'')))SS_ensureMusicPlaying(); }
    else { $('audioPlayer').pause(); MUSIC_ON=false; $('musicToggle').textContent='🔇'; }
    return;
  }
  playNext();
});
$('musicToggle').onclick=()=>{
  // FIX 6b: the toggle button only ever controls music of the CURRENT place.
  // If no song is selected for this place, the button does nothing (no wrong-place audio).
  // v2.8: while the PRIVATE memories slideshow is open, the toggle controls the
  // 'private' playlist so its own dedicated song plays/pauses here.
  const ctx=(SS_isOpen?SS_musicCtx():CURR_CTX)||'card';
  if(!musicGuard(ctx)){const mt=$('musicToggle');if(mt)mt.textContent='🔇';return;}
  const list=(ctx!=='card'&&buildPlaylistFor(ctx).length)?buildPlaylistFor(ctx):buildPlaylistFor('card');
  if(ctx==='slideshow'||ctx==='private'){CURR_CTX=ctx;CURR_LIST=list;CURR_IDX=-1;if(SS_ownPlaylist!==list){SS_ownPlaylist=list;SS_ownIdx=-1;}}
  else if(CURR_CTX!=='card'){CURR_CTX='card';CURR_LIST=buildPlaylistFor('card');CURR_IDX=-1;}
  const a=$('audioPlayer');
  // v2.8: if the loaded track doesn't belong to this place's playlist, load the right one first.
  if(a.src&&CURR_LIST.length&&!CURR_LIST.includes(a.currentSrc||a.src)){a.pause();a.src=CURR_LIST[0];a.volume=getVol(CURR_CTX);MUSIC_ON=false;}
  if(!a.src&&CURR_LIST.length){a.src=CURR_LIST[0];a.volume=getVol(CURR_CTX);}
  if(MUSIC_ON&&!a.paused){a.pause();MUSIC_ON=false;$('musicToggle').textContent='🔇'}
  else{MUSIC_ON=true;a.play().catch(()=>{});$('musicToggle').textContent='🔊'}
};

$('langToggle').onclick=()=>{
  const order=['en','gu','hi'];const i=order.indexOf(S.CURR_LANG);
  S.CURR_LANG=order[(i+1)%order.length];
  $('langToggle').textContent=S.CURR_LANG==='en'?'EN':(S.CURR_LANG==='gu'?'ગુ':'हि');
  $('langToggle').dataset.state=S.CURR_LANG;
  applyLangFull();
};
function applyLangFull(){
  const byLang=S.CURR.textsByLang||{};
  S.CURR.texts=byLang[S.CURR_LANG]||{};
  if($('viewerScreen').classList.contains('active'))renderCardFull();
}

function openAdminLoginFull(){
  $('adminPwError').classList.remove('show');$('adminPwInput').value='';
  show($('adminLoginModal'));setTimeout(()=>$('adminPwInput').focus(),150);
}
window.openAdminLogin=openAdminLoginFull;
$('adminPwCancel').onclick=()=>hide($('adminLoginModal'));
$('adminPwConfirm').onclick=tryAdminFull;
$('adminPwInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();tryAdminFull()}});
async function tryAdminFull(){
  const pw=$('adminPwInput').value;
  const exp=(S.CURR.shared&&S.CURR.shared.adminPassword)||FALLBACK_ADMIN_PW;
  if(pw===exp||pw===FALLBACK_ADMIN_PW){hide($('adminLoginModal'));await window.startAdmin()}
  else{$('adminPwError').classList.add('show');$('adminPwInput').value=''}
}

// FIX 2: legacy keys only apply to English
async function loadPersonIntoState(p){
  S.CURRENT_PERSON=p;
  S.CURR={texts:{},textsByLang:{en:{},gu:{},hi:{}},shared:{},gifts:[],story:[],events:[],voice:[],video:[],pins:[],media:[]};
  if(!p)return;
  const set=await sb.getSet(p.id);
  S.CURRENT_SETTINGS=set;
  const shared={};
  Object.keys(set).forEach(k=>{if(k.startsWith('shared__'))shared[k.substring(8)]=set[k]});
  S.CURR.shared=shared;
  function buildTextsForLang(L){
    const out={};const pref='texts__'+L+'_';
    Object.keys(set).forEach(k=>{if(k.startsWith(pref))out[k.substring(pref.length)]=set[k]});
    if(L==='en'){
      Object.keys(set).forEach(k=>{
        if(!k.startsWith('texts__'))return;
        const rest=k.substring(7);
        if(/^(en|gu|hi)_/.test(rest))return;
        if(out[rest]===undefined)out[rest]=set[k];
      });
    }
    return out;
  }
  S.CURR.textsByLang={en:buildTextsForLang('en'),gu:buildTextsForLang('gu'),hi:buildTextsForLang('hi')};
  const def=(shared.defaultLang||'en').toLowerCase();
  S.CURR_LANG=(['en','gu','hi'].indexOf(def)>=0)?def:'en';
  S.CURR.texts=S.CURR.textsByLang[S.CURR_LANG]||{};
  const lt=$('langToggle');
  if(lt){lt.textContent=S.CURR_LANG==='en'?'EN':(S.CURR_LANG==='gu'?'ગુ':'हि');lt.dataset.state=S.CURR_LANG;}
  S.CURR.gifts=await sb.rows(T_GIFTS,p.id)||[];
  S.CURR.story=await sb.rows(T_STORY,p.id)||[];
  S.CURR.events=await sb.rows(T_EVENTS,p.id)||[];
  S.CURR.voice=await sb.rows(T_VOICE,p.id)||[];
  S.CURR.video=await sb.rows(T_VIDEO,p.id)||[];
  S.CURR.pins=await sb.rows(T_PINS,p.id)||[];
  S.CURR.media=await sb.rows(T_MEDIA,p.id)||[];
}
window.__loadPersonIntoState__=loadPersonIntoState;

$('viewerBackBtn').onclick=()=>{
  SS_clearSession();
  // FIX 7: timer cleanup on close (spec §5.6) — stop countdown + hide lock screen
  try{ if(window.stopCountdownFull)window.stopCountdownFull(); }catch(e){}
  try{ hide($('lockScreen')); }catch(e){}
  hide($('viewerScreen'));S.PREVIEW_MODE=false;S.CARD_STARTED=false;S.REQUESTER_MODE=false;
  clearInterval(STORY_T);STORY_T=null;
  if(STORY_MINI){STORY_MINI.stop();STORY_MINI=null;}
  if(PIN_MINI){PIN_MINI.stop();PIN_MINI=null;}
  hide($('storyModal'));hide($('mapModal'));hide($('pinModal'));hide($('uploadModal'));hide($('closingModal'));
  if(VM_CURRENT){try{const v=VM_CURRENT.querySelector('video');if(v){v.pause();v.currentTime=0;v.removeAttribute('src');v.load();}}catch(e){}VM_CURRENT.remove();VM_CURRENT=null;}
  if(S.ADMIN_MODE)show($('adminPanel'));
  else $('homeScreen').classList.remove('hidden');
};

/* ============================================================
   SLIDESHOW
   ============================================================ */
let SS=[],SS_IDX=0,SS_T=null,SS_VIDEO_TIMER=null,SS_TX_T=null;
let SS_CTX='normal'; // 'normal' = regular memories | 'private' = private memories (same engine/rules, different source)
const PRIV_PREFIX='private_';
// Private rows are identified by the title prefix OR a dedicated `priv` flag (kept separate from public media).
function isPrivateRow(r){ if(r&&r.priv===true)return true; return String((r&&r.title)||'').indexOf(PRIV_PREFIX)===0; }
function privTitle(t){ return PRIV_PREFIX+(t||''); }
function stripPrivTitle(t){ return String(t||'').replace(new RegExp('^'+PRIV_PREFIX),''); }
function splitMedia(rows){ const out={pub:[],priv:[]}; (rows||[]).forEach(r=>{ (isPrivateRow(r)?out.priv:out.pub).push(r); }); return out; }
let SS_isOpen=false;
let SS_musicDucked=false;
let SS_touchSX=0,SS_touchSY=0;
let SS_floaterTimer=null;
let SS_rafId=null;
let SS_timerToken=0;
let SS_lastVisibilityChange=0;
let SS_ownPlaylist=[];
let SS_ownIdx=-1;

const SS_PHOTO_EFFECTS=['fx-ken-in','fx-ken-out','fx-pan-lr','fx-pan-rl','fx-pan-tb','fx-rotate','fx-fade','fx-blur','fx-scale-down'];
const SS_VIDEO_EFFECTS=['vfx-fade','vfx-zoom','vfx-slide-right','vfx-blur'];
const SS_FLOAT_EMOJI=['❤️','💕','✨','🌹','💖','🌸','⭐','💛','🎀','🕊️','🦋','💫','🌷','🎊','💗','🎈'];

function SS_clearTimers(){
  if(SS_T){clearTimeout(SS_T);SS_T=null;}
  if(SS_VIDEO_TIMER){clearTimeout(SS_VIDEO_TIMER);SS_VIDEO_TIMER=null;}
  if(SS_TX_T){clearTimeout(SS_TX_T);SS_TX_T=null;}
  if(SS_rafId){cancelAnimationFrame(SS_rafId);SS_rafId=null;}
  SS_timerToken++;
}
function SS_photoDurationMs(){
  const v=clampDuration((S.CURR.shared||{}).photoDurationSec||'5',5,1,60);
  return v*1000;
}
function SS_effectsEnabled(){
  const s=S.CURR.shared||{};
  const v=s.slideEffectsEnabled;
  return v===undefined ? true : String(v)!=='false';
}
function SS_effectsIntensity(){
  const v=parseFloat((S.CURR.shared||{}).effectsIntensity||'1');
  if(!isFinite(v)||v<=0)return 1;
  return Math.max(0.5,Math.min(1.6,v));
}
function SS_floatersEnabled(){
  const s=S.CURR.shared||{};
  const v=s.floatersEnabled;
  return v===undefined ? true : String(v)!=='false';
}
function SS_floaterDensity(){
  const v=parseInt((S.CURR.shared||{}).floaterDensity||'1',10);
  if(isNaN(v))return 1;
  return Math.max(0,Math.min(2,v));
}
function SS_resetVideo(v){
  try{ 
    v.pause(); 
    v.currentTime=0; 
    v.muted=true;
    v.volume=0;
  }catch(e){}
}
function SS_playVideo(v,unmuteBtn){
  try{ v.currentTime=0; }catch(e){}
  v.muted=false;
  v.volume=1;
  const p=v.play();
  if(p && p.then){
    p.then(()=>{ if(unmuteBtn)unmuteBtn.classList.remove('show'); })
     .catch(()=>{
        v.muted=true;
        const p2=v.play();
        if(p2 && p2.then){
          p2.then(()=>{ if(unmuteBtn)unmuteBtn.classList.add('show'); })
            .catch(()=>{ if(unmuteBtn)unmuteBtn.classList.add('show'); });
        }else{
          if(unmuteBtn)unmuteBtn.classList.add('show');
        }
     });
  }else{
    if(unmuteBtn)unmuteBtn.classList.add('show');
  }
}
function SS_fadeMusic(target,duration){
  const a=$('audioPlayer');if(!a)return;
  if(a.paused && target>0 && a.src){
    a.play().catch(()=>{});
  }
  const start=a.volume;
  if(Math.abs(start-target)<0.01){a.volume=target;return;}
  const steps=Math.max(1,Math.round((duration||400)/30));
  let i=0;
  if(a._ssFadeTimer)clearInterval(a._ssFadeTimer);
  a._ssFadeTimer=setInterval(()=>{
    i++;
    const t=i/steps;
    a.volume=Math.max(0,Math.min(1,start+(target-start)*t));
    if(i>=steps){clearInterval(a._ssFadeTimer);a._ssFadeTimer=null;a.volume=target;}
  },30);
}
function SS_normalMusicVol(){ return getVol(SS_musicCtx()); }
function SS_duckedMusicVol(){ return Math.max(0.05,SS_normalMusicVol()*0.35); }
// musicDuringVideo: when ON, background music keeps playing under video slides at vol_video_music (default 0.35) instead of ducking to 40%.
function SS_isMusicDuringVideo(){ return String((S.CURR.shared||{}).musicDuringVideo)==='true'; }
function SS_musicTargetVol(){ return SS_isMusicDuringVideo()?getVol('videomusic'):SS_normalMusicVol(); }

// FIXED (v3): SS_ensureMusicPlaying obeys the per-song 'where' selection as the
// SOLE placement rule (see songAllowedIn / buildPlaylistFor):
// - Songs chosen 'slideshow' or 'both' play here.
// - Songs chosen 'card' NEVER leak into the slideshow — under any setting.
// - If nothing is allowed in this context, audio pauses (no wrong-place playback).
function SS_ensureMusicPlaying(){
  const a=$('audioPlayer');
  if(!a)return;
  const mctx=SS_musicCtxSafe(); // v2.8b: robustly resolve 'private' vs 'slideshow' playlist
  const ssList=buildPlaylistFor(mctx);   // filtered by the per-song 'Play in' dropdown only
  let wantList=ssList;
  // v2.8b SAFETY NET: if the resolved context has NO songs but the PRIVATE slideshow
  // does have a dedicated song, fall back to the private playlist so the couple's
  // chosen private-memory song ALWAYS plays (same behavior as the normal slideshow).
  if(!wantList.length){
    const privList=buildPlaylistFor('private');
    if(privList.length){wantList=privList;}
  }
  if(!wantList || !wantList.length){
    if(!a.paused){ a.pause(); MUSIC_ON=false; $('musicToggle').textContent='🔇'; }
    return;
  }
  const curSrc=a.currentSrc||a.src||'';
  if(!a.paused && curSrc && !wantList.includes(curSrc)){
    // A track from another place (e.g. card-only song) is playing inside the
    // slideshow -> stop it and load the correct slideshow playlist instead.
    a.pause();
  }
  if(a.paused || !a.src || !wantList.includes(a.currentSrc||a.src||'')){
    SS_ownPlaylist=wantList;
    SS_ownIdx=0;
    a.loop=false;
    a.volume=getVol(mctx);
    CURR_CTX=mctx;CURR_LIST=wantList;CURR_IDX=0;
    const startPlay=()=>{
      a.play().then(()=>{
        MUSIC_ON=true;
        $('musicToggle').textContent='🔊';
        $('musicToggle').classList.add('visible');
      }).catch(()=>{
        // v2.8b: autoplay can be blocked until the src is fully loaded — retry once on 'canplay'.
        const retry=()=>{ a.play().then(()=>{MUSIC_ON=true;$('musicToggle').textContent='🔊';$('musicToggle').classList.add('visible');}).catch(()=>{MUSIC_ON=false;}); };
        if(a.readyState<3){ a.addEventListener('canplay',retry,{once:true}); a.load(); }
        else retry();
        MUSIC_ON=false;
      });
    };
    // v2.8b: only RE-assign src when it actually differs — re-assigning the same
    // URL would reset/pause the element and silently kill playback.
    if(a.src!==wantList[0]){ a.src=wantList[0]; }
    startPlay();
    return;
  }
  if(ssList.length && SS_musicDucked!==true){
    a.volume=getVol(mctx);
  }
}
function SS_nextTrackIfOwn(){
  const a=$('audioPlayer');
  if(!a)return;
  // v2.8b: if the own-playlist was lost (e.g. session restore), rebuild it for the
  // resolved context so the private slideshow's song keeps playing after each track ends.
  if(!SS_ownPlaylist || !SS_ownPlaylist.length){
    const rb=buildPlaylistFor(SS_musicCtxSafe());
    if(rb.length){SS_ownPlaylist=rb;SS_ownIdx=-1;}
  }
  if(!SS_ownPlaylist || !SS_ownPlaylist.length)return;
  SS_ownIdx=(SS_ownIdx+1)%SS_ownPlaylist.length;
  a.src=SS_ownPlaylist[SS_ownIdx];
  a.volume=getVol(SS_musicCtx());
  a.play().catch(()=>{});
}

// FIX 5: only apply saved order when shuffleMediaOn==='true' (private slideshow uses privateMediaOrder)
function SS_applySavedMediaOrder(rows,ctx){
  const s=S.CURR.shared||{};
  const base=(rows||[]).slice();
  if(String(s.shuffleMediaOn)!=='true')return base;
  const orderStr=((ctx==='private'?s.privateMediaOrder:s.mediaOrder)||'').trim();
  if(!orderStr||base.length<2)return base;
  const idxs=orderStr.split(',').map(x=>parseInt(x,10)).filter(x=>!isNaN(x)&&x>=0&&x<base.length);
  if(idxs.length!==base.length)return base;
  const seen=new Set();const out=[];
  idxs.forEach(i=>{if(!seen.has(i)){seen.add(i);out.push(base[i])}});
  base.forEach((r,i)=>{if(!seen.has(i))out.push(r)});
  return out;
}
function SS_movePhotoFirst(arr){
  if(!arr||!arr.length)return arr||[];
  const pi=arr.findIndex(r=>r.type!=='video');
  if(pi<=0)return arr;
  const out=arr.slice();
  const [p]=out.splice(pi,1);
  out.unshift(p);
  return out;
}

function SS_startFloaters(){
  const layer=$('ssFloaterLayer');if(!layer)return;
  layer.innerHTML='';
  if(!SS_floatersEnabled())return;
  const density=SS_floaterDensity();
  if(density===0)return;
  const perSpawn=density===1?2:3;
  const spawnEveryMs=density===1?900:500;
  const seedCount=density===1?12:20;
  const spawn=()=>{
    if(!SS_isOpen)return;
    if(!SS_floatersEnabled())return;
    for(let k=0;k<perSpawn;k++){
      const s=document.createElement('span');
      s.className='ss-floater';
      s.textContent=SS_FLOAT_EMOJI[Math.floor(Math.random()*SS_FLOAT_EMOJI.length)];
      s.style.left=(Math.random()*100)+'%';
      s.style.fontSize=(1.0+Math.random()*1.6)+'rem';
      const dur=(8+Math.random()*9)*(density===2?0.7:1);
      s.style.animationDuration=dur+'s';
      s.style.animationDelay=(Math.random()*1.5)+'s';
      layer.appendChild(s);
      setTimeout(()=>{ if(s.parentNode)s.parentNode.removeChild(s); },(dur+2)*1000);
    }
  };
  for(let i=0;i<seedCount;i++)setTimeout(spawn,i*(spawnEveryMs/seedCount));
  SS_floaterTimer=setInterval(spawn,spawnEveryMs);
}
function SS_stopFloaters(){
  if(SS_floaterTimer){clearInterval(SS_floaterTimer);SS_floaterTimer=null;}
  const layer=$('ssFloaterLayer');if(layer)layer.innerHTML='';
}

function SS_pickPhotoEffect(){
  return SS_PHOTO_EFFECTS[Math.floor(Math.random()*SS_PHOTO_EFFECTS.length)];
}
function SS_pickVideoEffect(){
  return SS_VIDEO_EFFECTS[Math.floor(Math.random()*SS_VIDEO_EFFECTS.length)];
}
function SS_applyIntensity(el){
  const inten=SS_effectsIntensity();
  const base=SS_photoDurationMs()+2000;
  const dur=Math.max(2500, Math.round(base / inten));
  el.style.setProperty('--fx-dur',dur+'ms');
}

function SS_loadSlideImage(idx){
  const t=$('slidesTrack');
  if(!t)return;
  const slideEl=t.children[idx];
  if(!slideEl)return;
  const s=SS[idx];
  if(!s || s.type==='video')return;
  const img=slideEl.querySelector('img.fx-target');
  if(!img)return;
  if(img.dataset.loaded==='1')return;
  if(!s.drive_id){ if(s.src){ img.src=s.src; } return; }
  img.dataset.loaded='1';
  img.src=driveImg(s.drive_id,2400);
  img.onerror=()=>{img.src='https://drive.google.com/thumbnail?id='+s.drive_id+'&sz=w'+(window.innerWidth < 700 ? 1200 : 2400);};
}
function SS_preloadAhead(){
  SS_loadSlideImage(SS_IDX);
  SS_loadSlideImage((SS_IDX+1)%SS.length);
  SS_loadSlideImage((SS_IDX+2)%SS.length);
  const t=$('slidesTrack');
  if(!t)return;
  Array.from(t.children).forEach((slideEl,i)=>{
    const dist=Math.min(
      Math.abs(i-SS_IDX),
      SS.length - Math.abs(i-SS_IDX)
    );
    if(dist>3){
      const img=slideEl.querySelector('img.fx-target');
      if(img && img.dataset.loaded==='1'){
        img.removeAttribute('src');
        img.dataset.loaded='0';
      }
    }
  });
}

function SS_saveSession(){
  try{
    if(S.CURRENT_PERSON && S.CURRENT_PERSON.slug){
      sessionStorage.setItem('active_person_slug', S.CURRENT_PERSON.slug);
      sessionStorage.setItem('active_view', 'viewer');
      sessionStorage.setItem('active_ss_ctx', SS_CTX||'normal');
    }
  }catch(e){}
}
function SS_clearSession(){
  try{
    sessionStorage.removeItem('active_person_slug');
    sessionStorage.removeItem('active_view');
    sessionStorage.removeItem('active_ss_ctx');
  }catch(e){}
}
function SS_restoreSession(){
  try{
    const slug=sessionStorage.getItem('active_person_slug');
    const view=sessionStorage.getItem('active_view');
    if(!slug || view!=='viewer')return false;
    const p=S.PEOPLE.find(x=>x.slug===slug);
    if(!p)return false;
    S.CURRENT_PERSON=p;
    loadPersonIntoState(p).then(async()=>{
      $('homeScreen').classList.add('hidden');
      show($('viewerScreen'));
      S.PREVIEW_MODE=false;
      S.REQUESTER_MODE=false;
      $('viewerPreviewTag').style.display='none';
      $('viewerEditCardBtn').classList.remove('visible');
      $('musicToggle').classList.toggle('visible',buildPlaylistFor('card').length>0);
      $('langToggle').classList.toggle('visible',true);
      renderCardFull();
      startCard();
      window.scrollTo(0,0);
      // If the slideshow was open (incl. private) when the tab closed, reopen it with the same rules
      if(sessionStorage.getItem('active_slideshow_open')==='1'){
        const ctx=sessionStorage.getItem('active_ss_ctx')||'normal';
        const rows=await sb.rows(T_MEDIA,p.id)||[];
        await SS_openFromRows(rows,ctx);
      }
    }).catch(()=>{});
    return true;
  }catch(e){ return false; }
}

// Shared slideshow opener — identical rules/functions for both buttons; only the media source differs.
async function SS_openFromRows(rows,ctx){
  const sp=splitMedia(rows||[]);
  const src=ctx==='private'?sp.priv:sp.pub;
  const filtered=(src||[]).filter(r=>(r.type==='video'&&r.src)||(r.type==='photo'&&(r.drive_id||r.src)));
  if(!filtered.length){await alert(ctx==='private'?'No private memories yet 🔒':'No memories yet 💕');return}
  const ordered=SS_applySavedMediaOrder(filtered,ctx);
  SS_CTX=ctx;
  SS=SS_movePhotoFirst(ordered);
  SS_IDX=0;
  SS_saveSession();
  SS_buildSlides();
  show($('slideshowOverlay'));
  SS_isOpen=true;
  SS_musicDucked=false;
  try{ sessionStorage.setItem('active_slideshow_open','1'); }catch(e){}
  SS_ensureMusicPlaying();
  SS_startFloaters();
  SS_updateSlide();
}
$('openBtn').onclick=async()=>{
  if(!S.CURRENT_PERSON){alert('No person selected.');return}
  const rows=await sb.rows(T_MEDIA,S.CURRENT_PERSON.id)||[];
  await SS_openFromRows(rows,'normal');
};
$('privateBtn').onclick=async()=>{
  if(!S.CURRENT_PERSON){alert('No person selected.');return}
  // 🔒 Private media is OTP-protected. The 6-digit OTP is generated ONLY in the Requester Portal
  // (derived from the Edit Key created when requester name + WhatsApp were added).
  const privOtp=getPrivateOtpForPerson(S.CURRENT_PERSON);
  if(!privOtp){alert('🔒 Private memories are locked. An OTP must be generated in the Requester Portal first (requires Requester name + WhatsApp).');return}
  const unlocked=(()=>{try{return sessionStorage.getItem('priv_unlocked_'+(S.CURRENT_PERSON.slug||S.CURRENT_PERSON.id))==='1'}catch(e){return false}})();
  if(unlocked){
    const rows=await sb.rows(T_MEDIA,S.CURRENT_PERSON.id)||[];
    await SS_openFromRows(rows,'private');
    return;
  }
  const errEl=$('privateOtpError');if(errEl)errEl.textContent='';
  const inp=$('privateOtpInput');if(inp)inp.value='';
  show($('privateOtpModal'));
  if(inp)setTimeout(()=>inp.focus(),80);
};
function privOtpFail(msg){
  const errEl=$('privateOtpError');
  if(errEl)errEl.textContent=msg||'❌ Incorrect OTP. Ask the requester for the 6-digit code from the Requester Portal.';
}
function privOtpTrySubmit(){
  const inp=$('privateOtpInput'),errEl=$('privateOtpError');
  if(errEl)errEl.textContent='';
  if(!inp)return;
  const val=String(inp.value||'').replace(/\D/g,'');
  inp.value=val;
  const expected=getPrivateOtpForPerson(S.CURRENT_PERSON);
  if(!expected){hide($('privateOtpModal'));alert('🔒 No OTP exists for this card yet. It is generated in the Requester Portal.');return}
  if(val!==expected){privOtpFail();return}
  try{sessionStorage.setItem('priv_unlocked_'+(S.CURRENT_PERSON.slug||S.CURRENT_PERSON.id),'1')}catch(e){}
  hide($('privateOtpModal'));
  sb.rows(T_MEDIA,S.CURRENT_PERSON.id).then(rows=>SS_openFromRows(rows||[],'private')).catch(()=>alert('Could not load private memories.'));
}
$('privateOtpSubmit').onclick=privOtpTrySubmit;
$('privateOtpClose').onclick=()=>{const e=$('privateOtpError');if(e)e.textContent='';hide($('privateOtpModal'))};
$('privateOtpInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();privOtpTrySubmit()}});

function SS_buildSlides(){
  const t=$('slidesTrack');t.innerHTML='';
  const dots=$('slideshowDots');if(dots)dots.innerHTML='';
  SS.forEach((s,i)=>{
    const d=document.createElement('div');
    d.className='slide'+(s.type==='video'?' video-slide':'');
    d.dataset.i=i;
    if(s.type==='video'){
      const v=document.createElement('video');
      v.src=s.src;
      v.playsInline=true;
      v.setAttribute('playsinline','');
      v.setAttribute('webkit-playsinline','');
      v.preload='metadata';
      v.setAttribute('disablepictureinpicture','');
      v.muted=true;
      d.appendChild(v);
      const ub=document.createElement('button');
      ub.className='unmute-btn';ub.type='button';ub.textContent='🔊 Tap for sound';
      ub.setAttribute('aria-label','Unmute video');
      const doUnmute=(e)=>{
        e.preventDefault();e.stopPropagation();
        v.muted=false;v.volume=1;
        const p=v.play();
        if(p&&p.then)p.then(()=>{ub.classList.remove('show')}).catch(()=>{});
      };
      ub.addEventListener('click',doUnmute);
      ub.addEventListener('touchstart',doUnmute,{passive:false});
      d.appendChild(ub);
      v.addEventListener('ended',()=>{
        if(SS_isOpen&&SS[SS_IDX]&&SS[SS_IDX]===s){ SS_clearTimers(); SS_next(); }
      });
      v.addEventListener('error',()=>{
        if(SS_isOpen&&SS[SS_IDX]&&SS[SS_IDX]===s){ SS_clearTimers(); setTimeout(()=>{if(SS_isOpen)SS_next();},800); }
      });
    }else{
      const img=document.createElement('img');
      img.className='fx-target';
      img.decoding='async';
      img.dataset.loaded='0';
      d.appendChild(img);
    }
    t.appendChild(d);
    if(dots){
      const dot=document.createElement('span');
      dot.className='dot';
      dot.dataset.i=i;
      dot.onclick=()=>{ SS_IDX=i; SS_updateSlide(); };
      dots.appendChild(dot);
    }
  });
}

function SS_applyEffectToCurrent(prevIndex){
  const t=$('slidesTrack');
  const cur=SS[SS_IDX];
  const slideEl=t.children[SS_IDX];
  if(!cur||!slideEl)return;
  SS_PHOTO_EFFECTS.forEach(c=>slideEl.classList.remove(c));
  SS_VIDEO_EFFECTS.forEach(c=>slideEl.classList.remove(c));
  if(!SS_effectsEnabled())return;
  if(cur.type==='video'){
    const fx=SS_pickVideoEffect();
    slideEl.classList.add(fx);
    const v=slideEl.querySelector('video');
    if(v){ v.style.animation='none'; void v.offsetWidth; v.style.animation=''; }
  }else{
    const fx=SS_pickPhotoEffect();
    slideEl.classList.add(fx);
    SS_applyIntensity(slideEl);
    const img=slideEl.querySelector('img.fx-target');
    if(img){
      img.style.animation='none';
      void img.offsetWidth;
      img.style.animation='';
    }
  }
}

function SS_animateTrackTo(){
  const t=$('slidesTrack');
  t.style.transition='transform .55s cubic-bezier(.7,0,.2,1)';
  t.style.transform=`translateX(-${SS_IDX*100}%)`;
}

function SS_updateSlide(){
  const t=$('slidesTrack');
  SS_animateTrackTo();
  txt($('slideshowCounter'),(SS_IDX+1)+' / '+SS.length);
  const dots=$('slideshowDots');
  if(dots)dots.querySelectorAll('.dot').forEach((el,i)=>el.classList.toggle('active',i===SS_IDX));
  SS_clearTimers();
  Array.from(t.children).forEach((slideEl,i)=>{
    if(i!==SS_IDX){
      const v=slideEl.querySelector('video');
      if(v)SS_resetVideo(v);
      const ub=slideEl.querySelector('.unmute-btn');
      if(ub)ub.classList.remove('show');
    }
  });
  const cur=SS[SS_IDX];
  const slideEl=t.children[SS_IDX];
  if(!cur||!slideEl)return;
  SS_applyEffectToCurrent();

  if(cur.type==='video'){
    if(SS_isMusicDuringVideo()){
      // Keep music playing under the video at vol_video_music (no ducking)
      if(SS_musicDucked!==false){ SS_fadeMusic(getVol('videomusic'),300); SS_musicDucked=false; }
    } else if(SS_musicDucked!==true){
      SS_fadeMusic(SS_duckedMusicVol(),300);
      SS_musicDucked=true;
    }
    const v=slideEl.querySelector('video');
    const ub=slideEl.querySelector('.unmute-btn');
    if(v){
      const tryPlay=()=>{ SS_playVideo(v,ub); };
      if(v.readyState>=1){ tryPlay(); }
      else{
        v.addEventListener('loadedmetadata',tryPlay,{once:true});
      }
    }
    const pb=$('slideshowProgress');
    if(pb){ pb.style.transition='none'; pb.style.width='0%'; }
  }else{
    // FIXED (v2): obey the per-song 'where' selection when resuming music on a non-video slide.
    const a=$('audioPlayer');
    let mctx=SS_musicCtxSafe(); // v2.8b: robustly resolve private vs slideshow
    let ssList=buildPlaylistFor(mctx);
    // v2.8b SAFETY NET: private slideshow always plays its dedicated song.
    if(!ssList.length){const pl=buildPlaylistFor('private');if(pl.length){mctx='private';ssList=pl;}}
    if(!ssList.length){
      // Nothing is allowed to play in this context -> stay silent.
      if(!a.paused){ a.pause(); MUSIC_ON=false; $('musicToggle').textContent='🔇'; }
    } else if(a.paused || !a.src){
      // Only resume in-place if the currently loaded track belongs to the slideshow playlist.
      const curSrc=a.currentSrc||a.src||'';
      const isOwn=(SS_ownPlaylist.length&&SS_ownPlaylist.includes(curSrc));
      if((CURR_LIST.length && (CURR_CTX==='slideshow'||CURR_CTX==='private') && ssList.includes(curSrc)) || isOwn){
        a.volume=getVol(mctx);
        a.play().catch(()=>{});
        MUSIC_ON=true;
        $('musicToggle').textContent='🔊';
        $('musicToggle').classList.add('visible');
      } else {
        // Wrong context / card-only song loaded / empty -> rebuild correct slideshow playlist.
        SS_ensureMusicPlaying();
      }
    } else {
      // FIX 6b: audio is playing while a slideshow slide is shown — verify the loaded
      // track really belongs to the slideshow playlist; otherwise swap/pause so that
      // card-only songs can never be heard inside the slideshow.
      const curSrc=a.currentSrc||a.src||'';
      if(!ssList.includes(curSrc)){
        SS_ensureMusicPlaying();
      } else {
        a.volume=getVol(mctx);
      }
    }
    if(SS_musicDucked!==false){
      SS_fadeMusic(SS_musicTargetVol(),300);
      SS_musicDucked=false;
    }

    SS_preloadAhead();

    const img = slideEl.querySelector('img.fx-target');
    const myToken = SS_timerToken;
    const curSlideRef = cur;

    const startTimer = () => {
      if(!SS_isOpen) return;
      if(SS[SS_IDX] !== curSlideRef) return;
      if(SS_timerToken !== myToken) return;

      const dur = SS_photoDurationMs();
      const pb = $('slideshowProgress');
      if(pb){
        pb.style.transition='none'; pb.style.width='0%';
        void pb.offsetWidth;
        pb.style.transition='width '+dur+'ms linear';
        pb.style.width='100%';
      }
      SS_T = setTimeout(()=>{
        if(!SS_isOpen) return;
        if(SS[SS_IDX] !== curSlideRef) return;
        if(SS_timerToken !== myToken) return;
        SS_next();
      }, dur);
    };

    if(img && !img.complete){
      img.addEventListener('load', startTimer, {once:true});
      img.addEventListener('error', startTimer, {once:true});
      setTimeout(startTimer, 6000);
    } else {
      startTimer();
    }
  }
}

function SS_next(){
  if(!SS.length){SS_close();return}
  SS_IDX=(SS_IDX+1)%SS.length;
  SS_updateSlide();
}
function SS_prev(){
  if(!SS.length)return;
  SS_IDX=(SS_IDX-1+SS.length)%SS.length;
  SS_updateSlide();
}
function SS_close(){
  SS_isOpen=false;
  try{ sessionStorage.removeItem('active_slideshow_open'); }catch(e){}
  hide($('slideshowOverlay'));
  SS_clearTimers();
  SS_stopFloaters();
  const t=$('slidesTrack');
  if(t)Array.from(t.children).forEach(slideEl=>{
    const v=slideEl.querySelector('video');if(v)SS_resetVideo(v);
    const ub=slideEl.querySelector('.unmute-btn');if(ub)ub.classList.remove('show');
    const img=slideEl.querySelector('img.fx-target');if(img){img.removeAttribute('src');img.dataset.loaded='0';}
  });
  if(t)t.innerHTML='';
  const dots=$('slideshowDots');if(dots)dots.innerHTML='';
  const pb=$('slideshowProgress');if(pb){pb.style.transition='none';pb.style.width='0%';}
  SS_musicDucked=false;
  SS_ownPlaylist=[];SS_ownIdx=-1;
  const a=$('audioPlayer');
  if(a){ a.volume=getVol('card'); }
  // FIX 6b: when the slideshow closes, ONLY card-selected songs may resume.
  // startMusicFor('card') rebuilds the playlist from buildPlaylistFor('card'),
  // so slideshow-only tracks can never leak back onto the card. If no song is
  // selected for the card, everything is stopped/paused here.
  if(typeof startMusicFor==='function')startMusicFor('card');
  if(!S.PREVIEW_MODE&&S.CURRENT_PERSON)openClosingModal();
}
$('slideshowPrev').onclick=SS_prev;
$('slideshowNext').onclick=SS_next;
$('slideshowClose').onclick=SS_close;

(function(){
  const sc=$('slideshowContainer');
  if(!sc)return;
  sc.addEventListener('touchstart',(e)=>{
    SS_touchSX=e.changedTouches[0].screenX;
    SS_touchSY=e.changedTouches[0].screenY;
  },{passive:true});
  sc.addEventListener('touchend',(e)=>{
    const dx=SS_touchSX-e.changedTouches[0].screenX;
    const dy=SS_touchSY-e.changedTouches[0].screenY;
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)){
      if(dx>0)SS_next(); else SS_prev();
    }
  },{passive:true});
})();
document.addEventListener('keydown',(e)=>{
  if(!SS_isOpen)return;
  if(e.key==='ArrowRight')SS_next();
  else if(e.key==='ArrowLeft')SS_prev();
  else if(e.key==='Escape')SS_close();
});

document.addEventListener('visibilitychange',()=>{
  const now = Date.now();
  if (now - SS_lastVisibilityChange < 500) return;
  SS_lastVisibilityChange = now;

  if(document.hidden){
    if(SS_T){clearTimeout(SS_T);SS_T=null;}
    if(SS_VIDEO_TIMER){clearTimeout(SS_VIDEO_TIMER);SS_VIDEO_TIMER=null;}
    const t=$('slidesTrack');
    if(t)Array.from(t.children).forEach(slideEl=>{
      const v=slideEl.querySelector('video');
      if(v&&!v.paused)v.pause();
    });
    const a=$('audioPlayer');if(a)a.pause();
  }else if(SS_isOpen){
    const a=$('audioPlayer');
    // FIX 6b: resume ONLY slideshow-selected songs, and only if the track that is
    // loaded actually belongs to the slideshow playlist (never a card-only song).
    if(a&&a.src&&(musicAllowedInCtx(SS_musicCtxSafe())||buildPlaylistFor('private').length)){
      const curSrc=a.currentSrc||a.src||'';
      const mctx=SS_musicCtxSafe(); // v2.8b: private slideshow has its own song list
    let ssList=buildPlaylistFor(mctx);
      if(!ssList.length){const pl=buildPlaylistFor('private');if(pl.length)ssList=pl;}
      if(ssList.includes(curSrc)){ a.volume=getVol(mctx); a.play().catch(()=>{}); }
      else { SS_ensureMusicPlaying(); }
    }
    const cur = SS[SS_IDX];
    if(cur && cur.type !== 'video'){
      if(!SS_T){
        const dur = SS_photoDurationMs();
        const curSlideRef = cur;
        const myToken = SS_timerToken;
        SS_T = setTimeout(()=>{
          if(!SS_isOpen) return;
          if(SS[SS_IDX] !== curSlideRef) return;
          if(SS_timerToken !== myToken) return;
          SS_next();
        }, dur);
      }
    }
  }
});

function openClosingModal(){
  const t=S.CURR.texts||{};
  txt($('closingTitleEl'),t.closeTitle||'💖 With Love');
  const parts=[t.close1,t.close2,t.close3,t.close4].filter(Boolean);
  $('closingBody').innerHTML=parts.length
    ? parts.map(p=>'<p style="margin-bottom:.8rem;">'+p.replace(/</g,'&lt;').replace(/\n/g,'<br>')+'</p>').join('')
    : '<p style="text-align:center;font-style:italic;color:var(--c-text-muted);">Thank you for watching 💕</p>';
  txt($('closingSignoff'),t.closeSignoff||'');
  txt($('closingDoneBtn'),t.closeBtn||'💛 Continue');
  show($('closingModal'));
}
$('closingClose').onclick=()=>advanceAfterClosing();
$('closingDoneBtn').onclick=()=>advanceAfterClosing();

// FIX 7: always open review modal (upsert handles existing)
function advanceAfterClosing(){
  hide($('closingModal'));
  const p=S.CURRENT_PERSON;
  if(!p){ goHomeClean(); return; }
  openReviewModal();
}

function goHomeClean(){
  try{ if(typeof SS_clearTimers==='function')SS_clearTimers(); }catch(e){}
  try{ if(typeof SS_stopFloaters==='function')SS_stopFloaters(); }catch(e){}
  try{ SS_isOpen=false; }catch(e){}
  try{ if(typeof STORY_MINI!=='undefined'&&STORY_MINI){STORY_MINI.stop();STORY_MINI=null;} }catch(e){}
  try{ if(typeof PIN_MINI!=='undefined'&&PIN_MINI){PIN_MINI.stop();PIN_MINI=null;} }catch(e){}
  try{ clearInterval(STORY_T);STORY_T=null; }catch(e){}
  try{ const a=$('audioPlayer'); if(a){a.pause();a.currentTime=0;} MUSIC_ON=false; const mt=$('musicToggle'); if(mt)mt.textContent='🔇'; }catch(e){}
  try{
    if(typeof VM_CURRENT!=='undefined'&&VM_CURRENT){
      const v=VM_CURRENT.querySelector('video');
      if(v){v.pause();v.currentTime=0;v.removeAttribute('src');v.load();}
      VM_CURRENT.remove();VM_CURRENT=null;
    }
  }catch(e){}
  hide($('slideshowOverlay'));
  hide($('storyModal'));
  hide($('mapModal'));
  hide($('pinModal'));
  hide($('uploadModal'));
  hide($('closingModal'));
  hide($('reviewModal'));
  hide($('viewerScreen'));
  hide($('lockScreen'));
  hide($('openingScreen'));
  S.CARD_STARTED=false;
  S.PREVIEW_MODE=false;
  S.REQUESTER_MODE=false;
  S.CURRENT_PERSON=null;
  try{ const t=$('slidesTrack'); if(t)t.innerHTML=''; }catch(e){}
  try{ const d=$('slideshowDots'); if(d)d.innerHTML=''; }catch(e){}
  window.scrollTo(0,0);
  $('homeScreen').classList.remove('hidden');
}

let RV_STARS=0;
function paintReviewStars(n){
  document.querySelectorAll('#reviewStars .star').forEach(s=>{ s.classList.toggle('on',+s.dataset.v<=n); });
  const hint=$('reviewStarHint');
  if(hint){ hint.textContent = n? ('You rated '+n+'/5 '+ '★'.repeat(n)) : 'Tap a star to rate'; }
}
document.querySelectorAll('#reviewStars .star').forEach(s=>{
  s.onclick=()=>{ RV_STARS=+s.dataset.v; S.REVIEW_STARS=RV_STARS; paintReviewStars(RV_STARS); };
  s.onmouseenter=()=>{ paintReviewStars(+s.dataset.v); };
});
$('reviewStars').onmouseleave=()=>{ paintReviewStars(RV_STARS); };

// FIX 7: prefill if existing review
function openReviewModal(){
  const p=S.CURRENT_PERSON;
  if(!p){refreshPage();return}
  txt($('reviewForWho'), 'Review for '+(p.display_name||p.slug||'')+(p.slug?' · #'+p.slug:'')+(p.requester_name?' · Requested by '+p.requester_name:''));
  const existing=(S.REVIEWS||[]).find(r=>r.person_slug&&p.slug&&r.person_slug.toLowerCase()===p.slug.toLowerCase());
  RV_STARS=existing?Math.max(1,Math.min(5,parseInt(existing.stars)||0)):0;
  S.REVIEW_STARS=RV_STARS;
  paintReviewStars(RV_STARS);
  $('reviewMessage').value=existing?(existing.message||''):'';
  $('reviewEmail').value=existing?(existing.email||''):'';
  const st=$('reviewStatus');if(st){st.textContent='';st.className='panel-status'}
  show($('reviewModal'));
}

$('reviewSubmit').onclick=async()=>{
  const st=$('reviewStatus');
  if(!RV_STARS){ st.textContent='❌ Please tap a star to rate.'; st.className='panel-status err'; return; }
  const msg=$('reviewMessage').value.trim();
  if(!msg){ st.textContent='❌ Review message is required.'; st.className='panel-status err'; return; }
  const email=$('reviewEmail').value.trim();
  if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ st.textContent='❌ Invalid email.'; st.className='panel-status err'; return; }
  const p=S.CURRENT_PERSON;
  if(!p){ st.textContent='❌ No person to review.'; st.className='panel-status err'; return; }
  const reqName = p.requester_name || 'Admin';
  const row={
    person_id: p.id||null,
    person_slug: p.slug||'',
    person_name: p.display_name||p.slug||'',
    requester_name: reqName,
    requester_wa: '',
    guest_id: null,
    stars: RV_STARS,
    message: msg,
    email: email||null
  };
  st.textContent='⏳ Saving…';st.className='panel-status';
  try{
    await sb.upsertReview(row);
    st.textContent='✅ Thank you!';st.className='panel-status ok';
    __showToast('💛 Review submitted');
    await loadReviews();
    setTimeout(()=>{
      hide($('reviewModal'));
      goHomeClean();
    }, 900);
  }catch(e){ st.textContent='❌ '+(e.message||'Could not save'); st.className='panel-status err'; }
};

function refreshPage(){
  try{ window.location.reload(); }catch(e){ location.href=location.href; }
}

function renderAdminReviews(){
  const el=$('adminReviewsList');if(!el)return;
  const revs=S.REVIEWS||[];
  if(!revs.length){ el.innerHTML='<div style="padding:.6rem;color:var(--c-text-muted);">No reviews yet.</div>'; return; }
  el.innerHTML=revs.map(r=>{
    const stars=Math.max(1,Math.min(5,parseInt(r.stars)||0));
    const date=r.created_at?new Date(r.created_at).toLocaleString():'';
    return `<div class="repeat-row" style="background:#fffdf8;">
      <div style="font-size:1rem;color:#ffb703;letter-spacing:2px;">${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</div>
      <div style="font-size:.85rem;line-height:1.6;margin-top:.3rem;">
        <strong>Person:</strong> ${(r.person_name||r.person_slug||'').replace(/</g,'&lt;')} ${r.person_slug?('<span class="person-id-pill">#'+r.person_slug.replace(/</g,'&lt;')+'</span>'):''}<br>
        <strong>Requester:</strong> ${(r.requester_name||'Admin').replace(/</g,'&lt;')}<br>
        <strong>Email:</strong> ${r.email?(String(r.email).replace(/</g,'&lt;')):'<em style="color:#a06c7a;">(none)</em>'}<br>
        <strong>When:</strong> ${date}
      </div>
      <div style="font-size:.9rem;line-height:1.6;font-style:italic;margin-top:.4rem;">"${(r.message||'').replace(/</g,'&lt;')}"</div>
      <div style="margin-top:.5rem;">
        <button type="button" class="panel-btn danger" style="min-width:0;padding:.35rem .8rem;font-size:.78rem;" data-del="${r.id}">🗑️ Delete review</button>
      </div>
    </div>`;
  }).join('');
  el.querySelectorAll('[data-del]').forEach(b=>{
    b.onclick=async()=>{
      if(!confirm('Delete this review?'))return;
      try{ await sb.delReview(parseInt(b.dataset.del)); __showToast('🗑️ Deleted'); await loadReviews(); }
      catch(e){ __showToast('❌ '+e.message,false); }
    };
  });
}
$('adminRefreshReviews').onclick=loadReviews;
window.startAdmin=async function(){
  S.ADMIN_MODE=true;
  if(!S.PEOPLE.length)S.PEOPLE=await sb.people()||[];
  if(!S.ADMIN_EDIT_PERSON_ID&&S.PEOPLE.length)S.ADMIN_EDIT_PERSON_ID=S.PEOPLE[0].id;
  if(S.ADMIN_EDIT_PERSON_ID){
    S.CURRENT_PERSON=S.PEOPLE.find(p=>p.id===S.ADMIN_EDIT_PERSON_ID)||null;
    if(S.CURRENT_PERSON)await reloadPerson(S.CURRENT_PERSON);
  }
  buildAdminPersonDropdown();
  loadAdminTextsForLang();
  applyAdminTextsToFields(S.ADMIN_EDIT_LANG);
  fillAdminFields();
  renderPeopleRepeater();
  renderAdminGifts();renderAdminStory();renderAdminEvents();
  renderAdminVoice();renderAdminVideo();renderAdminPins();renderAdminMedia();
  await loadReviews();
  show($('adminPanel'));
};
async function reloadPerson(p){if(window.__loadPersonIntoState__)return window.__loadPersonIntoState__(p);}

function loadAdminTextsForLang(){
  const set=S.CURRENT_SETTINGS||{};
  const byLang={en:{},gu:{},hi:{}};
  TEXT_FIELDS.forEach(f=>{
    byLang.en[f]=set['texts__en_'+f]!==undefined?set['texts__en_'+f]:(set['texts__'+f]||'');
    byLang.gu[f]=set['texts__gu_'+f]!==undefined?set['texts__gu_'+f]:'';
    byLang.hi[f]=set['texts__hi_'+f]!==undefined?set['texts__hi_'+f]:'';
  });
  S.CURRENT_TEXTS_BY_LANG=byLang;
}
document.querySelectorAll('#adminLangTabs button').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('#adminLangTabs button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    saveAdminTextsFromFields(S.ADMIN_EDIT_LANG);
    S.ADMIN_EDIT_LANG=btn.dataset.adminLang;
    applyAdminTextsToFields(S.ADMIN_EDIT_LANG);
  };
});
function applyAdminTextsToFields(lang){ const src=(S.CURRENT_TEXTS_BY_LANG&&S.CURRENT_TEXTS_BY_LANG[lang])||{}; TEXT_FIELDS.forEach(f=>{const el=$('f_'+f);if(!el)return; el.value=src[f]!==undefined?src[f]:'';}); }
function saveAdminTextsFromFields(lang){ const dst=(S.CURRENT_TEXTS_BY_LANG=S.CURRENT_TEXTS_BY_LANG||{en:{},gu:{},hi:{}}); dst[lang]=dst[lang]||{}; TEXT_FIELDS.forEach(f=>{const el=$('f_'+f);if(!el)return; dst[lang][f]=el.value;}); }

function buildAdminPersonDropdown(){
  const s=$('adminPersonSelect');if(!s)return;
  s.innerHTML='';
  if(!S.PEOPLE.length){ const o=document.createElement('option');o.value='';o.textContent='(no people yet)';s.appendChild(o);return; }
  S.PEOPLE.forEach(p=>{ const o=document.createElement('option');o.value=p.id;o.textContent='#'+p.id+' — '+(p.display_name||p.slug||'');s.appendChild(o); });
  if(S.ADMIN_EDIT_PERSON_ID)s.value=S.ADMIN_EDIT_PERSON_ID;
  s.onchange=async()=>{
    saveAdminTextsFromFields(S.ADMIN_EDIT_LANG);
    S.ADMIN_EDIT_PERSON_ID=parseInt(s.value)||null;
    S.CURRENT_PERSON=S.PEOPLE.find(p=>p.id===S.ADMIN_EDIT_PERSON_ID)||null;
    if(S.CURRENT_PERSON)await reloadPerson(S.CURRENT_PERSON);
    loadAdminTextsForLang();applyAdminTextsToFields(S.ADMIN_EDIT_LANG);fillAdminFields();
    renderAdminGifts();renderAdminStory();renderAdminEvents();
    renderAdminVoice();renderAdminVideo();renderAdminPins();renderAdminMedia();
  };
}

function fillAdminFields(){
  const sh=S.CURR.shared||{};
  const set=(id,v)=>{const el=$(id);if(el)el.value=(v===undefined||v===null)?'':v};
  ['ct1_datetime','ct2_datetime','ct3_datetime','unlockDateISO','hardExpiryISO'].forEach(key=>{
    const dtEl=$('f_'+key);
    const tzEl=$('f_'+key+'_tz');
    if(!dtEl)return;
    const tz=sh[key+'_tz']||DEFAULT_TZ;
    if(tzEl&&tzEl.options.length===0){
      TZ_OPTIONS.forEach(o=>{const opt=document.createElement('option');opt.value=o.v;opt.textContent=o.l;tzEl.appendChild(opt)});
    }
    if(tzEl){ tzEl.value=TZ_OPTIONS.find(o=>o.v===tz)?tz:DEFAULT_TZ; }
    dtEl.value=sh[key]?utcToZonedLocal(sh[key],tz):'';
  });
  set('f_ct1_dispdate',sh.ct1_dispdate);set('f_ct2_dispdate',sh.ct2_dispdate);set('f_ct3_dispdate',sh.ct3_dispdate);
  set('f_ct1_label2',sh.ct1_label||'');set('f_ct2_label2',sh.ct2_label||'');set('f_ct3_label2',sh.ct3_label||'');
  const cb=(id,v)=>{const el=$(id);if(el)el.checked=(String(v)!=='false')};
  cb('f_ct1_show',sh.ct1_show);cb('f_ct2_show',sh.ct2_show);cb('f_ct3_show',sh.ct3_show);
  set('f_adminPassword',sh.adminPassword||FALLBACK_ADMIN_PW);
  const dl=$('f_defaultLang');if(dl)dl.value=sh.defaultLang||'en';
  const tgl=(id,v)=>{const el=$(id);if(el)el.checked=(v==='true')};
  tgl('f_enableFireworks',sh.enableFireworks);tgl('f_enableGiftBox',sh.enableGiftBox);
  tgl('f_enableVoiceMsg',sh.enableVoiceMsg);tgl('f_enableVideoMsg',sh.enableVideoMsg);
  tgl('f_enableEventCount',sh.enableEventCount);tgl('f_enableStory',sh.enableStory);
  tgl('f_enableMap',sh.enableMap);tgl('f_enableUpload',sh.enableUpload);
  tgl('f_showLockScreen',sh.showLockScreen);tgl('f_pinSlideshowEnabled',sh.pinSlideshowEnabled);tgl('f_storySlideshowEnabled',sh.storySlideshowEnabled);
  tgl('f_shuffleMusicOn',sh.shuffleMusicOn);
  tgl('f_shuffleMediaOn',sh.shuffleMediaOn);
  tgl('f_slideEffectsEnabled',sh.slideEffectsEnabled!==undefined?sh.slideEffectsEnabled:'true');
  tgl('f_floatersEnabled',sh.floatersEnabled!==undefined?sh.floatersEnabled:'true');
  const pds=$('f_photoDurationSec');
  if(pds)pds.value=sh.photoDurationSec||'5';
  const ei=$('f_effectsIntensity');
  if(ei){ ei.value=sh.effectsIntensity||'1'; const el=$( 'f_effectsIntensity_val'); if(el)el.textContent=ei.value; }
  const fd=$('f_floaterDensity');
  if(fd){ fd.value=(sh.floaterDensity!==undefined?sh.floaterDensity:'1'); const el=$('f_floaterDensity_val'); if(el)el.textContent=fd.value; }
  document.querySelectorAll('input[name="music_mode"]').forEach(r=>{r.checked=(r.value===(sh.music_mode||'both'))});
  for(let i=1;i<=5;i++){ const onEl=$('f_song'+i+'_on');if(onEl)onEl.checked=(String(sh['song'+i+'_on'])==='true'); set('f_song'+i+'_url',sh['song'+i+'_url']); const wEl=$('f_song'+i+'_where');if(wEl){ const wv=sh['song'+i+'_where']||'both'; // v2.8b: if a saved value isn't present in this build's dropdown (e.g. legacy 'everywhere'), fall back to the first option instead of silently defaulting to 'Both'.
      wEl.value=wv; if(wEl.value!==wv){ wEl.selectedIndex=0; } } }
  const v=(id,key,def)=>{const el=$(id);if(!el)return;el.value=sh[key]||def;const lab=$(id+'_val');if(lab)lab.textContent=el.value};
  v('f_vol_card','vol_card','0.45');v('f_vol_slide','vol_slide','0.85');v('f_vol_private','vol_private','0.85');v('f_vol_video','vol_video','1.0');
  v('f_vol_video_music','vol_video_music','0.35');
  tgl('f_musicDuringVideo',sh.musicDuringVideo);
  v('f_pinSlideDuration','pinSlideDuration','4');v('f_storySlideDuration','storySlideDuration','10');
  const el1=$('f_pinSlideDefaultSec');if(el1)el1.value=sh.pinSlideDefaultSec||'10';
  const el2=$('f_storySlideDefaultSec');if(el2)el2.value=sh.storySlideDefaultSec||'10';
  document.querySelectorAll('#themeGrid .theme-swatch').forEach(el=>{el.classList.toggle('selected',el.dataset.themePick===(sh.theme||'romantic'))});
  if(sh.theme)document.body.setAttribute('data-theme',sh.theme);
  const flagEl=$('f_adminLoginEnabled');
  if(flagEl){ const v=sh.adminLoginEnabled; flagEl.checked = (v===undefined) ? true : (String(v)==='true'); }
}

function readAdminFields(){
  const g=id=>{const el=$(id);return el?el.value:''};
  const gTz=id=>{const el=$(id+'_tz');return el?el.value:DEFAULT_TZ};
  const sh=S.CURR.shared||{};
  ['ct1_datetime','ct2_datetime','ct3_datetime','unlockDateISO','hardExpiryISO'].forEach(key=>{
    const localVal=g('f_'+key);
    const tz=gTz('f_'+key);
    sh[key]=localVal?zonedToUTC(localVal,tz):null;
    sh[key+'_tz']=tz;
  });
  sh.ct1_dispdate=g('f_ct1_dispdate');sh.ct2_dispdate=g('f_ct2_dispdate');sh.ct3_dispdate=g('f_ct3_dispdate');
  sh.ct1_label=g('f_ct1_label2');sh.ct2_label=g('f_ct2_label2');sh.ct3_label=g('f_ct3_label2');
  sh.ct1_show=(($('f_ct1_show')||{}).checked)?'true':'false';
  sh.ct2_show=(($('f_ct2_show')||{}).checked)?'true':'false';
  sh.ct3_show=(($('f_ct3_show')||{}).checked)?'true':'false';
  sh.adminPassword=g('f_adminPassword')||FALLBACK_ADMIN_PW;
  const tgl=id=>{const el=$(id);return el&&el.checked?'true':'false'};
  sh.enableFireworks=tgl('f_enableFireworks');sh.enableGiftBox=tgl('f_enableGiftBox');
  sh.enableVoiceMsg=tgl('f_enableVoiceMsg');sh.enableVideoMsg=tgl('f_enableVideoMsg');
  sh.enableEventCount=tgl('f_enableEventCount');sh.enableStory=tgl('f_enableStory');
  sh.enableMap=tgl('f_enableMap');sh.enableUpload=tgl('f_enableUpload');
  sh.showLockScreen=tgl('f_showLockScreen');sh.pinSlideshowEnabled=tgl('f_pinSlideshowEnabled');sh.storySlideshowEnabled=tgl('f_storySlideshowEnabled');
  sh.adminLoginEnabled=tgl('f_adminLoginEnabled');
  sh.shuffleMusicOn=tgl('f_shuffleMusicOn');
  sh.shuffleMediaOn=tgl('f_shuffleMediaOn');
  sh.slideEffectsEnabled=tgl('f_slideEffectsEnabled');
  sh.floatersEnabled=tgl('f_floatersEnabled');
  const pds=$('f_photoDurationSec');
  sh.photoDurationSec=pds&&pds.value?pds.value:'5';
  const ei=$('f_effectsIntensity');
  sh.effectsIntensity=ei?ei.value:'1';
  const fd=$('f_floaterDensity');
  sh.floaterDensity=fd?fd.value:'1';
  document.querySelectorAll('input[name="music_mode"]').forEach(r=>{if(r.checked)sh.music_mode=r.value});
  for(let i=1;i<=5;i++){ sh['song'+i+'_on']=(($('f_song'+i+'_on')||{}).checked)?'true':'false'; sh['song'+i+'_url']=g('f_song'+i+'_url'); sh['song'+i+'_where']=(($('f_song'+i+'_where')||{}).value)||'both'; }
  sh.vol_card=g('f_vol_card');sh.vol_slide=g('f_vol_slide');sh.vol_private=g('f_vol_private');sh.vol_video=g('f_vol_video');
  sh.vol_video_music=g('f_vol_video_music');
  sh.musicDuringVideo=tgl('f_musicDuringVideo');
  sh.pinSlideDuration=g('f_pinSlideDuration');sh.storySlideDuration=g('f_storySlideDuration');
  sh.pinSlideDefaultSec=g('f_pinSlideDefaultSec');sh.storySlideDefaultSec=g('f_storySlideDefaultSec');
  sh.defaultLang=g('f_defaultLang')||'en';
  S.CURR.shared=sh;
}

document.querySelectorAll('#themeGrid .theme-swatch').forEach(el=>{
  el.onclick=()=>{ S.CURR.shared.theme=el.dataset.themePick; document.querySelectorAll('#themeGrid .theme-swatch').forEach(x=>x.classList.toggle('selected',x===el)); document.body.setAttribute('data-theme',el.dataset.themePick); };
});
document.addEventListener('input',(e)=>{
  ['f_vol_card','f_vol_slide','f_vol_private','f_vol_video','f_vol_video_music','f_pinSlideDuration','f_storySlideDuration','f_effectsIntensity'].forEach(id=>{
    if(e.target&&e.target.id===id){const lab=$(id+'_val');if(lab)lab.textContent=e.target.value}
  });
  if(e.target&&e.target.id==='f_floaterDensity'){const lab=$('f_floaterDensity_val');if(lab)lab.textContent=e.target.value}
});

function personKey(p,i){return p.id?'p-'+p.id:'tmp-'+i}

function renderPeopleRepeater(){
  const w=$('peopleRepeater');if(!w)return;
  w.innerHTML='';
  if(!S.PEOPLE.length){
    w.innerHTML='<div style="padding:.8rem;text-align:center;color:var(--c-text-muted);font-style:italic;font-size:.85rem;">No people yet. Click ➕ Add New Person to create one.</div>';
    const info=$('peopleCountInfo');if(info)info.textContent='0 people';
    return;
  }
  const info=$('peopleCountInfo');if(info)info.textContent=S.PEOPLE.length+' person'+(S.PEOPLE.length===1?'':'s');

  S.PEOPLE.forEach((p,i)=>{
    const key=personKey(p,i);
    const isExpanded=S.EXPANDED_PEOPLE.has(key);
    const wipeTz=p.wipe_iso_tz||DEFAULT_TZ;
    const wipeLocal=p.wipe_iso?utcToZonedLocal(p.wipe_iso,wipeTz):'';
    const wipeBadge=p.wipe_iso?('<span class="wipe-badge">🗓️ '+wipeLocal.replace('T',' ')+' ('+wipeTz+')</span>'):'';
    const idPill='<span class="person-id-pill">#'+(p.id||'new')+'</span>';
    const editPw=getEditPasswordForPerson(p);
    const editPwBadge=editPw?('<span class="editpw-badge">✏️ '+editPw+'</span>'):'<span class="editpw-badge" style="background:#f8f8f8;color:#888;border-color:#888;">✏️ needs Requester name + WhatsApp</span>';
    const privOtpBadge=(()=>{const o=getPrivateOtpForPerson(p);return o?('<span class="editpw-badge" style="background:#0d5c4a;border-color:#0d5c4a;">🔒 OTP '+o+'</span>'):'<span class="editpw-badge" style="background:#f8f8f8;color:#888;border-color:#888;">🔒 no private OTP</span>'})();
    const tzOptsHtml=TZ_OPTIONS.map(o=>`<option value="${o.v}"${o.v===wipeTz?' selected':''}>${o.l}</option>`).join('');
    const loginId=(p.slug||'—');

    const card=document.createElement('div');
    card.className='person-card'+(isExpanded?' expanded':'');
    card.dataset.personIndex=i;
    card.dataset.personKey=key;

    const summary=document.createElement('div');
    summary.className='person-summary';
    summary.innerHTML=`
      <div class="pc-emoji">💝</div>
      <div class="pc-body">
        <div class="pc-name">${(p.display_name||'Unnamed').replace(/</g,'&lt;')} ${idPill} ${wipeBadge} ${editPwBadge} ${privOtpBadge}</div>
        <div class="pc-meta"><span class="pc-id">Login ID: ${(loginId||'').replace(/</g,'&lt;')}</span></div>
      </div>
      <div class="pc-chev">▼</div>
    `;
    summary.onclick=()=>{
      if(S.EXPANDED_PEOPLE.has(key))S.EXPANDED_PEOPLE.delete(key);
      else S.EXPANDED_PEOPLE.add(key);
      renderPeopleRepeater();
    };
    card.appendChild(summary);

    if(isExpanded){
      const det=document.createElement('div');
      det.className='person-details';
      det.innerHTML=`
        <div class="panel-field" style="margin-top:.7rem;"><label class="panel-label">Display Name</label><input type="text" class="panel-input" data-pp="display_name" data-i="${i}" value="${(p.display_name||'').replace(/"/g,'&quot;')}"></div>
        <div class="panel-field"><label class="panel-label">Login ID / Slug</label><input type="text" class="panel-input" data-pp="slug" data-i="${i}" value="${(p.slug||'').replace(/"/g,'&quot;')}"></div>
        <div class="panel-field"><label class="panel-label">Birthday</label><input type="date" class="panel-input" data-pp="birthday" data-i="${i}" value="${(p.birthday||'').slice(0,10)}"></div>
        <div class="panel-field"><label class="panel-label">View Key</label><input type="text" class="panel-input" data-pp="password" data-i="${i}" maxlength="8" value="${(p.password||'').replace(/"/g,'&quot;')}" placeholder="Unique, max 8 characters"></div>
        <div class="panel-field"><label class="panel-label">Requester name (shown on reviews)</label><input type="text" class="panel-input" data-pp="requester_name" data-i="${i}" value="${(p.requester_name||'').replace(/"/g,'&quot;')}" placeholder="e.g. Deep Patel"></div>
        <div class="panel-field"><label class="panel-label">Requester WhatsApp (used for Edit Key)</label><input type="tel" class="panel-input" data-pp="requester_whatsapp" data-i="${i}" value="${(p.requester_whatsapp||'').replace(/"/g,'&quot;')}" placeholder="e.g. +971 55 348 8512"></div>
        <div class="panel-field" style="padding:.5rem;background:#eef3ff;border:1px dashed #1a3d8f;border-radius:.6rem;">
          <label class="panel-label" style="color:#1a3d8f;">✏️ Edit Key (auto)</label>
          <input type="text" class="panel-input" data-pp="editpw_readonly" data-i="${i}" readonly value="${editPw||''}" style="background:#f4f8ff;font-family:monospace;font-weight:800;color:#1a3d8f;">
          <div style="font-size:.68rem;color:#1a3d8f;font-style:italic;margin-top:.25rem;">Auto-generated Edit Key: unique, max 8 characters (e.g. K7QW2M4X). Same inputs always give the same key.</div>
          <label class="panel-label" style="color:#0d5c4a;margin-top:.5rem;display:block;">🔒 Private Media OTP (auto — required to open the private slideshow)</label>
          <input type="text" class="panel-input" data-pp="otp_readonly" data-i="${i}" readonly value="${getPrivateOtpForPerson(p)||''}" style="background:#e9f7f1;font-family:monospace;font-weight:800;color:#0d5c4a;letter-spacing:.3em;text-align:center;" placeholder="(requires Requester name + WhatsApp + Slug)">
          <div style="font-size:.68rem;color:#0d5c4a;font-style:italic;margin-top:.25rem;">6-digit code generated from the Edit Key. Share it with the couple so they can unlock “Open Our Private Memories”.</div>
        </div>
        <div class="panel-field" style="padding:.5rem;background:#fff0f0;border:1px dashed #8b0028;border-radius:.6rem;">
          <label class="panel-label" style="color:#8b0028;">🗓️ Auto-wipe this person on (date + time + timezone)</label>
          <div class="tz-row">
            <input type="datetime-local" class="panel-input" data-pp="wipe_local" data-i="${i}" value="${wipeLocal}">
            <select class="panel-select tz-select" data-pp="wipe_tz" data-i="${i}">${tzOptsHtml}</select>
          </div>
          <div style="font-size:.7rem;color:#8b0028;font-style:italic;margin-top:.35rem;">Reviews survive wipe.</div>
        </div>
        <div class="panel-field" style="text-align:center;display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;">
          <button type="button" class="repeat-add pw-gen" data-i="${i}" style="background:#2a5fd1;">🎲 Generate View Key (8-char)</button>
          <button type="button" class="repeat-add share-btn" data-i="${i}" style="background:linear-gradient(135deg,#25D366,#128C7E);">📲 Share via WhatsApp</button>
          <button type="button" class="view-details-btn" data-view-i="${i}">👁️ View Details</button>
          <button type="button" class="panel-btn danger" data-del-person="${i}" style="min-width:0;padding:.4rem .9rem;font-size:.8rem;">🗑️ Delete person</button>
        </div>
      `;
      card.appendChild(det);
    }
    w.appendChild(card);
  });

  w.querySelectorAll('input,select').forEach(el=>{
    el.oninput=el.onchange=()=>{
      const i=+el.dataset.i;
      if(el.dataset.pp==='editpw_readonly'||el.dataset.pp==='otp_readonly')return;
      if(el.dataset.pp==='wipe_local'){
        const tzEl=w.querySelector('.tz-select[data-pp="wipe_tz"][data-i="'+i+'"]');
        const tz=tzEl?tzEl.value:DEFAULT_TZ;
        S.PEOPLE[i].wipe_local=el.value;
        S.PEOPLE[i].wipe_iso=el.value?zonedToUTC(el.value,tz):null;
        S.PEOPLE[i].wipe_iso_tz=tz;
        renderPeopleRepeater();
      } else if(el.dataset.pp==='wipe_tz'){
        const dtEl=w.querySelector('input[data-pp="wipe_local"][data-i="'+i+'"]');
        const tz=el.value;
        S.PEOPLE[i].wipe_iso_tz=tz;
        if(dtEl&&dtEl.value)S.PEOPLE[i].wipe_iso=zonedToUTC(dtEl.value,tz);
        renderPeopleRepeater();
      } else if(el.dataset.pp){
        S.PEOPLE[i][el.dataset.pp]=el.value;
        if(el.dataset.pp==='password'){
          // 🔒 View Key: enforce the same rules as Edit Key — uppercase, max 8 characters
          const norm=normalizeViewPw(el.value);
          S.PEOPLE[i].password=norm; el.value=norm;
        }
        if(el.dataset.pp==='requester_name'||el.dataset.pp==='requester_whatsapp'||el.dataset.pp==='slug'){
          const prevFocus = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.pp;
          const prevVal = document.activeElement ? document.activeElement.value : '';
          renderPeopleRepeater();
          if(prevFocus){
            const sel='[data-pp="'+prevFocus+'"][data-i="'+i+'"]';
            const nf=w.querySelector(sel);
            if(nf){ nf.focus(); try{nf.setSelectionRange(prevVal.length,prevVal.length)}catch(e){} }
          }
        }
      }
    };
  });
  w.querySelectorAll('.pw-gen').forEach(b=>{ b.onclick=(e)=>{ e.stopPropagation(); const i=+b.dataset.i; const p=S.PEOPLE[i]; // 🔒 View Key — same rules as Edit Key: unique, max 8 characters
    p.password=ensureUniqueViewPw(makeViewerPassword(p.display_name,p.birthday,p.slug),S.PEOPLE,i); S.EXPANDED_PEOPLE.add(personKey(p,i)); renderPeopleRepeater(); }; });
  w.querySelectorAll('.share-btn').forEach(b=>{ b.onclick=(e)=>{ e.stopPropagation(); openShareModal(S.PEOPLE[+b.dataset.i],null); }; });
  w.querySelectorAll('[data-view-i]').forEach(b=>{ b.onclick=(e)=>{ e.stopPropagation(); openPersonDetails(S.PEOPLE[+b.dataset.viewI]); }; });
  w.querySelectorAll('[data-del-person]').forEach(b=>{ b.onclick=(e)=>{
    e.stopPropagation();
    const i=+b.dataset.delPerson;
    const p=S.PEOPLE[i];
    if(!confirm('Delete "'+(p.display_name||p.slug||'this person')+'"?\n\nClick 💾 Save to apply.'))return;
    S.PEOPLE.splice(i,1);
    renderPeopleRepeater();
    buildAdminPersonDropdown();
  }; });
}

function apResetForm(){
  $('ap_name').value='';$('ap_slug').value='';$('ap_password').value='';$('ap_birthday').value='';
  $('ap_requester').value='';$('ap_requester_wa').value='';$('ap_wipe_local').value='';$('ap_editpw_preview').value='';
  const otpEl=$('ap_private_otp_preview');if(otpEl)otpEl.value='';
  const tzEl=$('ap_wipe_tz'); if(tzEl){fillTzSelect(tzEl,DEFAULT_TZ);tzEl.value=DEFAULT_TZ;}
  const st=$('ap_status');if(st){st.textContent='';st.className='panel-status'}
}
function apRefreshEditPwPreview(){
  const pw=makeRequesterEditPassword($('ap_requester').value,$('ap_requester_wa').value,$('ap_slug').value);
  $('ap_editpw_preview').value=pw;
  const otpEl=$('ap_private_otp_preview');
  if(otpEl)otpEl.value=makePrivateOtp(pw)||'';
}
function apGeneratePw(){
  // 🔒 View Key — same rules as the Edit Key: unique, max 8 characters, uppercase (e.g. T9RK3XQW)
  $('ap_password').value=ensureUniqueViewPw(makeViewerPassword($('ap_name').value,$('ap_birthday').value,$('ap_slug').value),S.PEOPLE);
}
function apOpenModal(){
  apResetForm();
  const tzEl=$('ap_wipe_tz');
  if(tzEl&&tzEl.options.length===0){ TZ_OPTIONS.forEach(o=>{const opt=document.createElement('option');opt.value=o.v;opt.textContent=o.l;tzEl.appendChild(opt)}); }
  if(tzEl)tzEl.value=DEFAULT_TZ;
  show($('addPersonModal'));
  setTimeout(()=>$('ap_name').focus(),150);
}
async function apSavePerson(){
  const st=$('ap_status');
  const name=$('ap_name').value.trim();
  const slug=$('ap_slug').value.trim().toLowerCase().replace(/[^a-z0-9\-_]/g,'');
  const password=$('ap_password').value.trim();
  const birthday=$('ap_birthday').value.trim();
  const requester_name=$('ap_requester').value.trim();
  const requester_whatsapp=$('ap_requester_wa').value.trim();
  const wipeLocal=$('ap_wipe_local').value;
  const tzEl=$('ap_wipe_tz'); const wipeTz=tzEl?tzEl.value:DEFAULT_TZ;
  if(!name){ st.textContent='❌ Display Name is required.'; st.className='panel-status err'; return false; }
  if(!slug){ st.textContent='❌ Login ID / Slug is required.'; st.className='panel-status err'; return false; }
  const dupe=S.PEOPLE.find(p=>p.slug&&p.slug.toLowerCase()===slug);
  if(dupe){ st.textContent='❌ Login ID "'+slug+'" is already used.'; st.className='panel-status err'; return false; }
  const wipeIso=wipeLocal?zonedToUTC(wipeLocal,wipeTz):null;
  // 🔒 View Key: auto-generate when left blank — unique, max 8 characters (same rules as Edit Key)
  const viewPw=password?normalizeViewPw(password):(ensureUniqueViewPw(makeViewerPassword(name,birthday,slug),S.PEOPLE)||'');
  const row={slug,display_name:name,password:viewPw,birthday:birthday||null,wipe_iso:wipeIso,enabled:true,sort_order:S.PEOPLE.length,requester_name:requester_name||'',requester_whatsapp:requester_whatsapp||''};
  st.textContent='⏳ Saving to cloud…'; st.className='panel-status';
  let savedId=null;
  try{ const r=await sb.insPerson(row); if(r&&r[0]&&r[0].id)savedId=r[0].id; }
  catch(e){
    const msg=(e.message||'').toLowerCase();
    if(msg.includes('requester_whatsapp'))delete row.requester_whatsapp;
    if(msg.includes('requester_name'))delete row.requester_name;
    if(msg.includes('wipe_iso'))delete row.wipe_iso;
    if(msg.includes('birthday'))delete row.birthday;
    try{ const r2=await sb.insPerson(row); if(r2&&r2[0]&&r2[0].id)savedId=r2[0].id; }
    catch(e2){ st.textContent='❌ '+((e2.message||'').slice(0,180)); st.className='panel-status err'; return false; }
  }
  if(!savedId){ st.textContent='❌ Person not saved (no id returned).'; st.className='panel-status err'; return false; }
  const newPerson={id:savedId,slug,display_name:name,password:password||'',birthday:birthday||'',requester_name:requester_name||'',requester_whatsapp:requester_whatsapp||'',wipe_iso:wipeIso||null,wipe_iso_tz:wipeTz,enabled:true,sort_order:S.PEOPLE.length};
  S.PEOPLE.push(newPerson);
  S.EXPANDED_PEOPLE.add(personKey(newPerson,S.PEOPLE.length-1));
  if(window.buildHome)window.buildHome();
  renderPeopleRepeater();buildAdminPersonDropdown();
  st.textContent='✅ Saved "'+name+'" (#'+savedId+')'; st.className='panel-status ok';
  return true;
}
$('openAddPersonBtn').onclick=()=>apOpenModal();
$('addPersonClose').onclick=()=>hide($('addPersonModal'));
$('ap_cancel').onclick=()=>hide($('addPersonModal'));
$('ap_generatePw').onclick=()=>apGeneratePw();
['ap_requester','ap_requester_wa','ap_slug'].forEach(id=>{ const el=$(id);if(!el)return; el.addEventListener('input',apRefreshEditPwPreview); });
$('ap_saveClose').onclick=async()=>{ const ok=await apSavePerson(); if(ok)setTimeout(()=>hide($('addPersonModal')),700); };
$('ap_saveNew').onclick=async()=>{ const ok=await apSavePerson(); if(ok)setTimeout(()=>apResetForm(),500); };
['ap_name','ap_slug','ap_password','ap_birthday','ap_requester','ap_requester_wa','ap_wipe_local'].forEach(id=>{
  const el=$(id);if(!el)return;
  el.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); $('ap_saveClose').click(); } });
});
$('peopleToggleAll').onclick=()=>{
  const anyCollapsed=S.PEOPLE.some((p,i)=>!S.EXPANDED_PEOPLE.has(personKey(p,i)));
  if(anyCollapsed){ S.PEOPLE.forEach((p,i)=>S.EXPANDED_PEOPLE.add(personKey(p,i))); }
  else { S.EXPANDED_PEOPLE.clear(); }
  renderPeopleRepeater();
};
$('addPersonRow').onclick=()=>{
  const newPerson={id:null,slug:'',display_name:'',birthday:'',password:'',requester_name:'',requester_whatsapp:'',wipe_iso:null,wipe_iso_tz:DEFAULT_TZ,enabled:true,sort_order:S.PEOPLE.length};
  S.PEOPLE.push(newPerson);
  S.EXPANDED_PEOPLE.add(personKey(newPerson,S.PEOPLE.length-1));
  renderPeopleRepeater();buildAdminPersonDropdown();
};

let SHARE_CTX={person:null,guest:null};
function openShareModal(person,guest){
  if(!person){__showToast('❌ No person to share',false);return}
  if(!person.id){__showToast('❌ Save the person first',false);return}
  SHARE_CTX={person,guest};
  const link=buildCardLink(person.slug);
  const requesterName=(guest&&guest.guest_name)||(guest&&guest.payload&&guest.payload.guest_info&&guest.payload.guest_info.name)||person.requester_name||'';
  const requesterWa=(guest&&guest.guest_whatsapp)||(guest&&guest.payload&&guest.payload.guest_info&&guest.payload.guest_info.whatsapp)||person.requester_whatsapp||'';
  const editPw=getEditPasswordForPerson(Object.assign({},person,{requester_name:requesterName,requester_whatsapp:requesterWa}));
  const wa=String(requesterWa||'').replace(/[^0-9]/g,'');
  txt($('shareModalTitle'),'📲 Share "'+(person.display_name||person.slug)+'" with requester');
  const esc=s=>String(s==null?'':s).replace(/</g,'&lt;');
  const body=
    '<div style="background:#fffdf8;border:1px dashed rgba(196,30,58,.35);border-radius:.8rem;padding:.8rem;margin-bottom:.8rem;font-size:.88rem;line-height:1.7;">'
    +'<div style="font-weight:900;color:var(--c-primary);margin-bottom:.5rem;">🔑 Card credentials</div>'
    +'<div><strong>Login ID / Slug:</strong> <code style="background:#fff0f0;padding:.15rem .45rem;border-radius:.35rem;font-family:monospace;color:#8b0028;">'+esc(person.slug||'')+'</code></div>'
    +'<div><strong>View Key:</strong> <code style="background:#fff0f0;padding:.15rem .45rem;border-radius:.35rem;font-family:monospace;color:#8b0028;">'+esc(person.password||'(not set)')+'</code></div>'
    +'<div><strong>Edit Key:</strong> <code style="background:#eef3ff;padding:.15rem .45rem;border-radius:.35rem;font-family:monospace;color:#1a3d8f;">'+esc(editPw||'(add Requester name + WhatsApp)')+'</code></div>'
    +'<div><strong>🔒 Private Media OTP (6-digit):</strong> <code style="background:#e9f7f1;padding:.15rem .45rem;border-radius:.35rem;font-family:monospace;font-weight:800;color:#0d5c4a;letter-spacing:.15em;">'+esc(makePrivateOtp(editPw)||'(generated after Edit Key exists)')+'</code></div>'
    +'<div style="margin-top:.5rem;"><strong>Card link (always the current live link):</strong> <a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer" style="color:#0a4f8f;word-break:break-all;">'+esc(link)+'</a></div>'
    +'</div>'
    +'<div style="background:linear-gradient(135deg,#e8f5f0,#d3ede1);border:2px solid #0d5c4a;border-radius:.8rem;padding:.8rem;margin-bottom:.8rem;font-size:.86rem;line-height:1.7;">'
    +'<div style="font-weight:900;color:#0d5c4a;margin-bottom:.45rem;">📲 Send to requester (WhatsApp)</div>'
    +'<div><strong>Requester:</strong> '+esc(requesterName||'(unknown)')+'</div>'
    +'<div><strong>Number:</strong> '+esc(wa||'(not provided)')+'</div>'
    +'</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;">'
    +'<button type="button" class="panel-btn wa" id="shareWaBtn">💬 Send on WhatsApp</button>'
    +'<button type="button" class="panel-btn save" id="shareCopyBtn">📋 Copy message</button>'
    +'<button type="button" class="panel-btn cancel" id="shareCloseBtn">Close</button>'
    +'</div>';
  $('shareModalBody').innerHTML=body;
  show($('shareModal'));
  const msg=buildShareMessage(requesterName,person,link,editPw);
  $('shareWaBtn').onclick=()=>{
    const url=wa?('https://wa.me/'+wa+'?text='+encodeURIComponent(msg)):('https://wa.me/?text='+encodeURIComponent(msg));
    window.open(url,'_blank');
    if(SHARE_CTX.guest&&SHARE_CTX.guest.id){
      sb.updGuest(SHARE_CTX.guest.id,{approved_login_id:person.slug||'',approved_password:person.password||'',approved_share_link:link,approved_at:new Date().toISOString()}).catch(()=>{});
    }
  };
  $('shareCopyBtn').onclick=async()=>{ try{ await navigator.clipboard.writeText(msg); __showToast('✅ Message copied'); }catch(e){ prompt('Copy this message:',msg); } };
  $('shareCloseBtn').onclick=()=>hide($('shareModal'));
}
$('shareModalClose').onclick=()=>hide($('shareModal'));
function buildShareMessage(requesterName,person,link,editPw){
  const name=requesterName||'there';
  // v2.8: ALWAYS rebuild the link from the CURRENT live URL at send/copy time,
  // so a stale or hard-coded link can never be shared by mistake.
  const liveLink=buildCardLink((person&&person.slug)||'');
  return ['Hi '+name+' 💕','','Your surprise for *'+((person&&person.display_name)||(person&&person.slug)||'')+'* is ready! 🎉','','🔑 Login ID: '+((person&&person.slug)||''),'🔒 View Key: '+((person&&person.password)||''),'✏️ Edit Key: '+(editPw||''),'🔐 Private Memories OTP (6-digit, needed to open the private slideshow): '+(makePrivateOtp(editPw)||''),'🌐 Open here: '+liveLink,'','How to use:','• To VIEW the surprise → use the View Key.','• To EDIT the card → use the Edit Key (you will see an ✏️ Edit Card button).','• To open 📸 Private Memories → enter the 6-digit OTP when prompted.','','Steps:','1) Open the link above.','2) Tap the button with the person\'s name.','3) Enter the View Key (view) OR the Edit Key (edit).','4) Tap the 🎂 cake to reveal the surprise.','','Enjoy! 💖'].join('\n');
}


async function openPersonDetails(p){
  if(!p){alert('No person.');return}
  const titleEl=$('personDetailsTitle'),subEl=$('personDetailsSub'),bodyEl=$('personDetailsBody');
  titleEl.textContent='👁️ #'+(p.id||'new')+' — '+(p.display_name||p.slug||'Person');
  const wipeDisplay=p.wipe_iso?(utcToZonedLocal(p.wipe_iso,p.wipe_iso_tz||DEFAULT_TZ).replace('T',' ')+' ('+(p.wipe_iso_tz||DEFAULT_TZ)+')'):'';
  const editPw=getEditPasswordForPerson(p);
  subEl.textContent='Login ID: '+(p.slug||'—')+(p.birthday?' · Birthday: '+p.birthday:'')+' · View Key: '+(p.password||'(not set)')+' · Edit Key: '+(editPw||'(missing requester info)')+(p.requester_name?' · Requester: '+p.requester_name:'')+(wipeDisplay?' · 🗓️ Wipes on: '+wipeDisplay:'');
  bodyEl.innerHTML='<div style="padding:1rem;text-align:center;color:var(--c-text-muted);font-style:italic;">Loading…</div>';
  show($('personDetailsModal'));
  let set={},gifts=[],story=[],events=[],voice=[],video=[],pins=[],media=[],reviews=[];
  if(p.id){
    try{
      set=await sb.getSet(p.id)||{};
      const [g,s,e,vo,vi,pi,me]=await Promise.all([
        sb.rows(T_GIFTS,p.id),sb.rows(T_STORY,p.id),sb.rows(T_EVENTS,p.id),
        sb.rows(T_VOICE,p.id),sb.rows(T_VIDEO,p.id),sb.rows(T_PINS,p.id),sb.rows(T_MEDIA,p.id)
      ]);
      gifts=g||[];story=s||[];events=e||[];voice=vo||[];video=vi||[];pins=pi||[];media=me||[];
      const allR=S.REVIEWS||[];
      reviews=allR.filter(r=>(r.person_id===p.id)||(r.person_slug&&p.slug&&r.person_slug.toLowerCase()===p.slug.toLowerCase()));
    }catch(e){console.warn(e)}
  }else{
    const en=S.CURRENT_TEXTS_BY_LANG&&S.CURRENT_TEXTS_BY_LANG.en||{};
    const gu=S.CURRENT_TEXTS_BY_LANG&&S.CURRENT_TEXTS_BY_LANG.gu||{};
    const hi=S.CURRENT_TEXTS_BY_LANG&&S.CURRENT_TEXTS_BY_LANG.hi||{};
    TEXT_FIELDS.forEach(f=>{ if(en[f]!==undefined)set['texts__en_'+f]=en[f]; if(gu[f]!==undefined)set['texts__gu_'+f]=gu[f]; if(hi[f]!==undefined)set['texts__hi_'+f]=hi[f]; });
    Object.keys(S.CURR.shared||{}).forEach(k=>{set['shared__'+k]=S.CURR.shared[k]});
    gifts=S.CURR.gifts||[];story=S.CURR.story||[];events=S.CURR.events||[];voice=S.CURR.voice||[];video=S.CURR.video||[];pins=S.CURR.pins||[];media=S.CURR.media||[];
  }
  const shared={};const texts={en:{},gu:{},hi:{}};
  Object.keys(set).forEach(k=>{
    if(k.startsWith('shared__')){shared[k.substring(8)]=set[k];return}
    if(k.startsWith('texts__en_')){texts.en[k.substring(9)]=set[k];return}
    if(k.startsWith('texts__gu_')){texts.gu[k.substring(9)]=set[k];return}
    if(k.startsWith('texts__hi_')){texts.hi[k.substring(9)]=set[k];return}
    if(k.startsWith('texts__')){texts.en[k.substring(7)]=set[k];return}
  });
  const esc=s=>String(s==null?'':s).replace(/</g,'&lt;');
  const row=(label,val)=>{if(val===undefined||val===null||val==='')return'';return '<div class="detail-row"><strong>'+label+':</strong> '+esc(val)+'</div>'};
  const thumbs=(items,getter)=>{ const html=items.map(getter).filter(Boolean); if(!html.length)return''; return '<div class="thumb-grid">'+html.map(u=>'<div class="thumb"><img src="'+u+'" loading="lazy"></div>').join('')+'</div>'; };
  let h='';
  const link=buildCardLink(p.slug);
  h+='<div class="detail-block"><div class="detail-block-title">👤 Person</div>'
    + row('ID',p.id) + row('Display Name',p.display_name) + row('Login ID / Slug',p.slug)
    + row('Birthday',p.birthday) + row('View Key',p.password||'(not set)')
    + row('Requester name',p.requester_name||'')
    + row('Requester WhatsApp',p.requester_whatsapp||'')
    + row('✏️ Edit Key',editPw||'(missing requester name/whatsapp)')
    + row('🔒 Private Media OTP (6-digit)',makePrivateOtp(editPw)||'(generated after Edit Key exists)')
    + row('🗓️ Wipe on',p.wipe_iso?(new Date(p.wipe_iso).toISOString()+' · '+utcToZonedLocal(p.wipe_iso,p.wipe_iso_tz||DEFAULT_TZ)+' '+(p.wipe_iso_tz||DEFAULT_TZ)):'')
    + row('Card link',link)
    + '</div>';
  h+='<div class="detail-block"><div class="detail-block-title">⭐ Reviews for this person ('+reviews.length+')</div>';
  if(!reviews.length)h+='<div class="detail-count">No reviews yet.</div>';
  reviews.forEach(r=>{
    const stars=Math.max(1,Math.min(5,parseInt(r.stars)||0));
    h+='<div class="detail-row" style="color:#ffb703;font-size:.95rem;letter-spacing:2px;">'+'★'.repeat(stars)+'<span style="color:#ddd;">'+'★'.repeat(5-stars)+'</span></div>';
    h+='<div class="detail-row" style="padding-left:.3rem;">"'+(r.message||'').replace(/</g,'&lt;')+'"</div>';
    if(r.email)h+='<div class="detail-row" style="padding-left:.3rem;font-size:.75rem;color:var(--c-text-muted);">Email: '+(r.email||'').replace(/</g,'&lt;')+'</div>';
  });
  h+='</div>';
  h+='<div class="detail-block"><div class="detail-block-title">🎨 Theme & Features</div>'
    + row('Theme',shared.theme||'(default: romantic)') + row('Default language',shared.defaultLang||'(default: en)') + row('Music mode',shared.music_mode)
    + row('Card volume',shared.vol_card) + row('Slideshow volume',shared.vol_slide) + row('Private Slideshow volume',shared.vol_private) + row('Video volume',shared.vol_video)
    + row('Photo duration (sec)',shared.photoDurationSec)
    + row('Slide effects enabled',shared.slideEffectsEnabled==='true'?'✅ On':'❌ Off')
    + row('Effects intensity',shared.effectsIntensity)
    + row('Floaters enabled',shared.floatersEnabled==='true'?'✅ On':'❌ Off')
    + row('Floater density',shared.floaterDensity)
    + row('Shuffle music on save',shared.shuffleMusicOn==='true'?'✅ On':'❌ Off')
    + row('Shuffle media on save',shared.shuffleMediaOn==='true'?'✅ On':'❌ Off');
  ['enableFireworks','enableGiftBox','enableVoiceMsg','enableVideoMsg','enableEventCount','enableStory','enableMap','enableUpload','showLockScreen','pinSlideshowEnabled','storySlideshowEnabled'].forEach(k=>{h+=row(k,shared[k]==='true'?'✅ On':'❌ Off')});
  for(let i=1;i<=5;i++){ if(shared['song'+i+'_url']){ h+=row('Song '+i+' ('+(shared['song'+i+'_where']||'both')+')',shared['song'+i+'_url']+' '+(shared['song'+i+'_on']==='true'?'✅':'❌')); } }
  h+='</div>';
  h+='<div class="detail-block"><div class="detail-block-title">💕 Counters</div>';
  COUNTERS.forEach((c,idx)=>{
    const on=String(shared[c.showKey])!=='false';
    const tz=shared[c.tzKey]||DEFAULT_TZ;
    const local=shared[c.dtKey]?utcToZonedLocal(shared[c.dtKey],tz):'';
    h+=row('Counter '+(idx+1)+' show',on?'✅ On':'❌ Off');
    h+=row('Counter '+(idx+1)+' label',shared[c.labelKey]);
    h+=row('Counter '+(idx+1)+' date (UTC)',shared[c.dtKey]);
    h+=row('Counter '+(idx+1)+' date ('+tz+')',local);
    h+=row('Counter '+(idx+1)+' display',shared[c.dispKey]);
  });
  h+='</div>';
  h+='<div class="detail-block"><div class="detail-block-title">🔓 Unlock</div>'
    + row('Unlock date (UTC)',shared.unlockDateISO)
    + row('Unlock timezone',shared.unlockDateISO_tz)
    + row('Unlock local',shared.unlockDateISO?utcToZonedLocal(shared.unlockDateISO,shared.unlockDateISO_tz||DEFAULT_TZ):'')
    + '</div>';
  ['en','gu','hi'].forEach(lang=>{
    const tl=texts[lang]||{};let any=false;TEXT_FIELDS.forEach(k=>{if(tl[k])any=true});
    if(!any&&lang!=='en')return;
    h+='<div class="detail-block"><div class="detail-block-title">💌 Texts — '+lang.toUpperCase()+'</div>';
    if(!any)h+='<div class="detail-count">No text saved for this language.</div>';
    TEXT_FIELDS.forEach(k=>{if(tl[k])h+=row(k,tl[k])});
    h+='</div>';
  });
  h+='<div class="detail-block"><div class="detail-block-title">🎁 Gifts ('+gifts.length+')</div>';
  if(!gifts.length)h+='<div class="detail-count">No gifts.</div>';
  gifts.forEach((g,i)=>{h+='<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc((g.emoji||'🎁')+' '+(g.title||''))+'</div>';if(g.message)h+='<div class="detail-row" style="padding-left:1rem;">💬 '+esc(g.message)+'</div>';if(g.photo_drive_id)h+='<div class="detail-row" style="padding-left:1rem;">📷 Drive: '+esc(g.photo_drive_id)+'</div>'});
  h+='</div>';
  h+='<div class="detail-block"><div class="detail-block-title">📖 Story ('+story.length+')</div>';
  if(!story.length)h+='<div class="detail-count">No story.</div>';
  story.forEach((s,i)=>{h+='<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc(s.title||'')+'</div>';if(s.body)h+='<div class="detail-row" style="padding-left:1rem;">'+esc(s.body)+'</div>';if(s.photo_drive_id)h+='<div class="detail-row" style="padding-left:1rem;">📷 '+esc(s.photo_drive_id)+'</div>'});
  h+='</div>';
  h+='<div class="detail-block"><div class="detail-block-title">📅 Events ('+events.length+')</div>';
  if(!events.length)h+='<div class="detail-count">No events.</div>';
  events.forEach((e,i)=>{h+='<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc((e.icon||'📅')+' '+(e.label||''))+' — '+esc(e.target_iso)+'</div>'});
  h+='</div>';
  h+='<div class="detail-block"><div class="detail-block-title">🔊 Voice ('+voice.length+')</div>';
  if(!voice.length)h+='<div class="detail-count">No voice.</div>';
  voice.forEach((v,i)=>{h+='<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc(v.title||'')+' — '+esc(v.audio_url||'')+'</div>'});
  h+='</div>';
  h+='<div class="detail-block"><div class="detail-block-title">🎬 Video ('+video.length+')</div>';
  if(!video.length)h+='<div class="detail-count">No video.</div>';
  video.forEach((v,i)=>{h+='<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc(v.title||'')+' — '+esc(v.video_url||'')+'</div>'});
  h+='</div>';
  h+='<div class="detail-block"><div class="detail-block-title">🗺️ Pins ('+pins.length+')</div>';
  if(!pins.length)h+='<div class="detail-count">No pins.</div>';
  pins.forEach((pp,i)=>{h+='<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc(pp.label||'')+' — '+esc(pp.lat)+', '+esc(pp.lng)+'</div>';if(pp.photo_drive_id)h+='<div class="detail-row" style="padding-left:1rem;">📷 '+esc(pp.photo_drive_id)+'</div>';if(pp.story)h+='<div class="detail-row" style="padding-left:1rem;">'+esc(pp.story)+'</div>'});
  h+='</div>';
  const spAdm=splitMedia(S.CURR.media||[]);
  h+='<div class="detail-block"><div class="detail-block-title">📸 Slideshow ('+spAdm.pub.length+') · 🔒 Private ('+spAdm.priv.length+')</div>';
  if(!media.length)h+='<div class="detail-count">No photos.</div>';
  media.forEach((m,i)=>{h+='<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc(m.type||'photo')+' '+esc(m.drive_id||m.src||'')+'</div>'});
  h+=thumbs(media,m=>m.drive_id?'https://lh3.googleusercontent.com/d/'+m.drive_id+'=w300':(m.src||''));
  h+='</div>';
  bodyEl.innerHTML=h;
}
$('personDetailsClose').onclick=()=>hide($('personDetailsModal'));
$('personDetailsModal').addEventListener('click',(e)=>{if(e.target===$('personDetailsModal'))hide($('personDetailsModal'))});

function renderAdminGifts(){ const w=$('giftsRepeater');if(!w)return;w.innerHTML=''; (S.CURR.gifts||[]).forEach((g,i)=>{ const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Emoji</label><input type="text" class="panel-input" data-gg="emoji" data-i="${i}" value="${(g.emoji||'🎁')}"></div><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gg="title" data-i="${i}" value="${(g.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Message</label><textarea class="panel-textarea" data-gg="message" data-i="${i}">${(g.message||'')}</textarea></div><div class="panel-field"><label class="panel-label">Photo Drive ID (comma-separate for slideshow)</label><input type="text" class="panel-input" data-gg="photo_drive_id" data-i="${i}" value="${(g.photo_drive_id||'')}"></div>`; w.appendChild(row); }); w.querySelectorAll('input,textarea').forEach(el=>{el.oninput=()=>{S.CURR.gifts[+el.dataset.i][el.dataset.gg]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{S.CURR.gifts.splice(+b.dataset.i,1);renderAdminGifts()}}); }
$('addGiftRow').onclick=()=>{S.CURR.gifts=S.CURR.gifts||[];S.CURR.gifts.push({emoji:'🎁',title:'',message:'',photo_drive_id:''});renderAdminGifts()};
function renderAdminStory(){ const w=$('storyRepeater');if(!w)return;w.innerHTML=''; (S.CURR.story||[]).forEach((s,i)=>{ const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-st="title" data-i="${i}" value="${(s.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Body</label><textarea class="panel-textarea" data-st="body" data-i="${i}">${(s.body||'')}</textarea></div><div class="panel-field"><label class="panel-label">Photo Drive ID (comma-separate for slideshow)</label><input type="text" class="panel-input" data-st="photo_drive_id" data-i="${i}" value="${(s.photo_drive_id||'')}"></div>`; w.appendChild(row); }); w.querySelectorAll('input,textarea').forEach(el=>{el.oninput=()=>{S.CURR.story[+el.dataset.i][el.dataset.st]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{S.CURR.story.splice(+b.dataset.i,1);renderAdminStory()}}); }
$('addStoryRow').onclick=()=>{S.CURR.story=S.CURR.story||[];S.CURR.story.push({title:'',body:'',photo_drive_id:''});renderAdminStory()};
function renderAdminEvents(){ const w=$('eventsRepeater');if(!w)return;w.innerHTML=''; (S.CURR.events||[]).forEach((ev,i)=>{ const row=document.createElement('div');row.className='repeat-row';
  const tz=ev.target_iso_tz||DEFAULT_TZ; const local=ev.target_iso?utcToZonedLocal(ev.target_iso,tz):'';
  const tzOptsHtml=TZ_OPTIONS.map(o=>`<option value="${o.v}"${o.v===tz?' selected':''}>${o.l}</option>`).join('');
  row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Icon</label><input type="text" class="panel-input" data-ev="icon" data-i="${i}" value="${(ev.icon||'📅')}"></div><div class="panel-field"><label class="panel-label">Label</label><input type="text" class="panel-input" data-ev="label" data-i="${i}" value="${(ev.label||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Target date &amp; time + timezone</label><div class="tz-row"><input type="datetime-local" class="panel-input" data-ev="target_local" data-i="${i}" value="${local}"><select class="panel-select tz-select" data-ev="target_tz" data-i="${i}">${tzOptsHtml}</select></div></div>`;
  w.appendChild(row); });
  w.querySelectorAll('input,select').forEach(el=>{
    el.oninput=el.onchange=()=>{
      const i=+el.dataset.i;
      if(el.dataset.ev==='target_local'){ const tzEl=w.querySelector('.tz-select[data-ev="target_tz"][data-i="'+i+'"]'); const tz=tzEl?tzEl.value:DEFAULT_TZ; S.CURR.events[i].target_iso=el.value?zonedToUTC(el.value,tz):''; S.CURR.events[i].target_iso_tz=tz; }
      else if(el.dataset.ev==='target_tz'){ const dtEl=w.querySelector('input[data-ev="target_local"][data-i="'+i+'"]'); const tz=el.value; S.CURR.events[i].target_iso_tz=tz; if(dtEl&&dtEl.value)S.CURR.events[i].target_iso=zonedToUTC(dtEl.value,tz); }
      else if(el.dataset.ev){ S.CURR.events[i][el.dataset.ev]=el.value; }
    };
  });
  w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{S.CURR.events.splice(+b.dataset.i,1);renderAdminEvents()}}); }
$('addEventRow').onclick=()=>{S.CURR.events=S.CURR.events||[];S.CURR.events.push({icon:'📅',label:'',target_iso:'',target_iso_tz:DEFAULT_TZ});renderAdminEvents()};
function renderAdminVoice(){ const w=$('voiceRepeater');if(!w)return;w.innerHTML=''; (S.CURR.voice||[]).forEach((v,i)=>{ const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-vc="title" data-i="${i}" value="${(v.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Audio URL</label><input type="text" class="panel-input" data-vc="audio_url" data-i="${i}" value="${(v.audio_url||'')}"></div>`; w.appendChild(row); }); w.querySelectorAll('input').forEach(el=>{el.oninput=()=>{S.CURR.voice[+el.dataset.i][el.dataset.vc]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{S.CURR.voice.splice(+b.dataset.i,1);renderAdminVoice()}}); }
$('addVoiceRow').onclick=()=>{S.CURR.voice=S.CURR.voice||[];S.CURR.voice.push({title:'',audio_url:''});renderAdminVoice()};
function renderAdminVideo(){ const w=$('videoRepeater');if(!w)return;w.innerHTML=''; (S.CURR.video||[]).forEach((v,i)=>{ const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-vd="title" data-i="${i}" value="${(v.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Video URL</label><input type="text" class="panel-input" data-vd="video_url" data-i="${i}" value="${(v.video_url||'')}"></div>`; w.appendChild(row); }); w.querySelectorAll('input').forEach(el=>{el.oninput=()=>{S.CURR.video[+el.dataset.i][el.dataset.vd]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{S.CURR.video.splice(+b.dataset.i,1);renderAdminVideo()}}); }
$('addVideoRow').onclick=()=>{S.CURR.video=S.CURR.video||[];S.CURR.video.push({title:'',video_url:''});renderAdminVideo()};
function renderAdminPins(){ const w=$('pinsRepeater');if(!w)return;w.innerHTML=''; (S.CURR.pins||[]).forEach((p,i)=>{ const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Label</label><input type="text" class="panel-input" data-pn="label" data-i="${i}" value="${(p.label||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Lat</label><input type="text" class="panel-input" data-pn="lat" data-i="${i}" value="${p.lat||''}"></div><div class="panel-field"><label class="panel-label">Lng</label><input type="text" class="panel-input" data-pn="lng" data-i="${i}" value="${p.lng||''}"></div><div class="panel-field"><label class="panel-label">Photo IDs (comma-separate for slideshow)</label><input type="text" class="panel-input" data-pn="photo_drive_id" data-i="${i}" value="${(p.photo_drive_id||'')}"></div><div class="panel-field"><label class="panel-label">Story</label><textarea class="panel-textarea" data-pn="story" data-i="${i}">${(p.story||'')}</textarea></div>`; w.appendChild(row); }); w.querySelectorAll('input,textarea').forEach(el=>{el.oninput=()=>{S.CURR.pins[+el.dataset.i][el.dataset.pn]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{S.CURR.pins.splice(+b.dataset.i,1);renderAdminPins()}}); }
$('addPinRow').onclick=()=>{S.CURR.pins=S.CURR.pins||[];S.CURR.pins.push({label:'',lat:'',lng:'',photo_drive_id:'',story:''});renderAdminPins()};
function renderAdminMedia(){ const w=$('mediaRepeater');if(!w)return;w.innerHTML=''; (S.CURR.media||[]).forEach((m,i)=>{ const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Type</label><select class="panel-select" data-md="type" data-i="${i}"><option value="photo"${m.type==='photo'?' selected':''}>Photo</option><option value="video"${m.type==='video'?' selected':''}>Video</option></select></div><div class="panel-field"><label class="panel-label">Drive ID (photo)</label><input type="text" class="panel-input" data-md="drive_id" data-i="${i}" value="${(m.drive_id||'')}"></div><div class="panel-field"><label class="panel-label">Direct URL (video/photo)</label><input type="text" class="panel-input" data-md="src" data-i="${i}" value="${(m.src||'')}"></div><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-md="title" data-i="${i}" value="${(m.title||'').replace(/"/g,'&quot;')}"></div>`; w.appendChild(row); }); w.querySelectorAll('input,select').forEach(el=>{el.onchange=el.oninput=()=>{S.CURR.media[+el.dataset.i][el.dataset.md]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{S.CURR.media.splice(+b.dataset.i,1);renderAdminMedia()}}); }
$('addMediaRow').onclick=()=>{S.CURR.media=S.CURR.media||[];S.CURR.media.push({type:'photo',drive_id:'',src:'',title:''});renderAdminMedia()};

async function saveAdminAll(){
  saveAdminTextsFromFields(S.ADMIN_EDIT_LANG);
  readAdminFields();
  const sh=S.CURR.shared||{};
  // FIX 5: clear order when shuffle is off
  if(String(sh.shuffleMusicOn)==='true'){
    const idxs=[];
    for(let i=1;i<=5;i++){ const on=String(sh['song'+i+'_on'])==='true'; const url=(sh['song'+i+'_url']||'').trim(); if(on&&url)idxs.push(i-1); }
    sh.musicOrder=idxs.length?shuffleArray(idxs).join(','):'';
  }else{
    sh.musicOrder='';
  }
  if(String(sh.shuffleMediaOn)==='true'){
    const n=(S.CURR.media||[]).length;
    sh.mediaOrder=n>1?shuffleArray(Array.from({length:n},(_,i)=>i)).join(','):'';
    const pn=splitMedia(S.CURR.media||[]).priv.length;
    sh.privateMediaOrder=pn>1?shuffleArray(Array.from({length:pn},(_,i)=>i)).join(','):'';
  }else{
    sh.mediaOrder='';
    sh.privateMediaOrder='';
  }
  const dbPeople=await sb.people()||[];
  const dbIds=new Set(dbPeople.map(p=>p.id));
  const keepIds=new Set();
  const usedSlugs=new Set();
  for(let i=0;i<S.PEOPLE.length;i++){
    const p=S.PEOPLE[i];
    if(!p.display_name&&!p.slug)continue;
    let slug=(p.slug||('person-'+Date.now()+'-'+i)).toLowerCase().replace(/[^a-z0-9\-_]/g,'');
    while(usedSlugs.has(slug))slug=slug+'-'+Math.floor(Math.random()*1000);
    usedSlugs.add(slug);p.slug=slug;
    // ✏️ Edit Key: enforce uniqueness across all people (same 8-char rules as before)
    const editBase=getEditPasswordForPerson(p);
    if(editBase)p.edit_password=ensureUniqueEditPw(editBase,S.PEOPLE,i);
    // 🔒 View Key: auto-generate when blank/legacy — unique, max 8 characters (same rules as Edit Key)
    const storedView=normalizeViewPw(p.password);
    const viewPw=storedView||ensureUniqueViewPw(makeViewerPassword(p.display_name,p.birthday,slug),S.PEOPLE,i);
    if(viewPw&&viewPw!==p.password){p.password=viewPw;}
    const row={slug,display_name:p.display_name||('Person '+(i+1)),password:viewPw,birthday:p.birthday||null,wipe_iso:p.wipe_iso||null,enabled:true,sort_order:i,requester_name:p.requester_name||'',requester_whatsapp:p.requester_whatsapp||''};
    if(!p.id){ let r;try{ r=await sb.insPerson(row);}catch(e){ delete row.wipe_iso;delete row.birthday;delete row.requester_whatsapp;delete row.requester_name; r=await sb.insPerson(row); } if(r&&r[0]&&r[0].id)p.id=r[0].id; }
    else{ try{await sb.updPerson(p.id,row)}catch(e){ delete row.wipe_iso;delete row.birthday;delete row.requester_whatsapp;delete row.requester_name; await sb.updPerson(p.id,row); } }
    if(p.id)keepIds.add(p.id);
  }
  const toDelete=[];dbIds.forEach(id=>{if(!keepIds.has(id))toDelete.push(id)});
  for(const id of toDelete)await wipeOnePerson(id);
  const tasks=[];
  if(S.CURRENT_PERSON&&S.CURRENT_PERSON.id){
    const pid=S.CURRENT_PERSON.id;
    const settings={};
    Object.keys(S.CURR.shared).forEach(k=>{
      // FIX 8 (spec §3.1/§4.4): persist as strings — booleans/dates flattened to text values.
      const v=S.CURR.shared[k];
      if(v===null||v===undefined){ settings['shared__'+k]=''; }
      else if(typeof v==='boolean'){ settings['shared__'+k]=v?'true':'false'; }
      else { settings['shared__'+k]=String(v); }
    });
    ['en','gu','hi'].forEach(lang=>{ const tl=S.CURRENT_TEXTS_BY_LANG[lang]||{}; TEXT_FIELDS.forEach(f=>{settings['texts__'+lang+'_'+f]=tl[f]!==undefined?tl[f]:''}); });
    tasks.push(sb.upSet(settings,pid));
    const wi=async(table,rows)=>{ await sb.wipe(table,pid); const clean=rows.filter(r=>r); if(clean.length)await sb.insBatch(table,clean); };
    tasks.push(wi(T_GIFTS,(S.CURR.gifts||[]).filter(g=>g.title||g.message||g.photo_drive_id).map(g=>({person_id:pid,emoji:g.emoji||'🎁',title:g.title||'',message:g.message||'',photo_drive_id:g.photo_drive_id||''}))));
    tasks.push(wi(T_STORY,(S.CURR.story||[]).filter(s=>s.title||s.body).map(s=>({person_id:pid,title:s.title||'',body:s.body||'',photo_drive_id:s.photo_drive_id||''}))));
    tasks.push(wi(T_EVENTS,(S.CURR.events||[]).filter(e=>e.label||e.target_iso).map(e=>({person_id:pid,icon:e.icon||'📅',label:e.label||'',target_iso:e.target_iso||''}))));
    tasks.push(wi(T_VOICE,(S.CURR.voice||[]).filter(v=>v.audio_url).map(v=>({person_id:pid,title:v.title||'',audio_url:v.audio_url||''}))));
    tasks.push(wi(T_VIDEO,(S.CURR.video||[]).filter(v=>v.video_url).map(v=>({person_id:pid,title:v.title||'',video_url:v.video_url||''}))));
    tasks.push(wi(T_PINS,(S.CURR.pins||[]).filter(p=>p.lat&&p.lng).map(p=>({person_id:pid,label:p.label||'',lat:p.lat,lng:p.lng,photo_drive_id:p.photo_drive_id||'',story:p.story||''}))));
    // Admin does NOT manage private media — keep existing private rows untouched, never add new ones from admin panel.
    const admSplit=splitMedia(S.CURR.media||[]);
    const admExistingPriv=admSplit.priv.map(m=>Object.assign({},m,{priv:true}));
    const cleanMedia=dedupeMedia((admSplit.pub||[]).filter(m=>m.drive_id||m.src)).concat(admExistingPriv);
    tasks.push(wi(T_MEDIA,cleanMedia.map(m=>({person_id:pid,type:m.type||'photo',drive_id:m.drive_id||'',src:m.src||'',title:m.title||'',sort_order:0}))));
  }
  const gsSet={ shared__adminLoginEnabled : String(S.CURR.shared.adminLoginEnabled!=='false') };
  tasks.push(sb.upSet(gsSet,null));
  await Promise.all(tasks);
  S.PEOPLE=await sb.people()||[];
  if(window.buildHome)window.buildHome();
  renderPeopleRepeater();buildAdminPersonDropdown();
}
$('adminSave').onclick=async()=>{ const t0=Date.now();window.__showToast('⏳ Saving…'); try{ await saveAdminAll(); window.__showToast('✅ Saved in '+Math.round((Date.now()-t0)/100)/10+'s'); setTimeout(()=>hide($('adminPanel')),300); } catch(e){window.__showToast('❌ '+(e.message||'Save failed'),false);console.error(e)} };
$('adminSavePreviewBtn').onclick=async()=>{ const t0=Date.now();window.__showToast('⏳ Saving then previewing…'); try{ await saveAdminAll(); const fresh=S.PEOPLE.find(p=>p.id===S.ADMIN_EDIT_PERSON_ID); if(!fresh){window.__showToast('❌ No person selected',false);return} S.CURRENT_PERSON=fresh; await loadPersonIntoState(fresh); hide($('adminPanel'));S.PREVIEW_MODE=true;S.REQUESTER_MODE=false; await showViewerFor(fresh,true); window.__showToast('✅ Saved & previewing ('+Math.round((Date.now()-t0)/100)/10+'s)'); } catch(e){window.__showToast('❌ '+(e.message||'Preview failed'),false);console.error(e)} };
$('adminPreviewBtn').onclick=async()=>{ if(!S.CURRENT_PERSON){alert('Pick a person first.');return} saveAdminTextsFromFields(S.ADMIN_EDIT_LANG);readAdminFields(); S.CURR.textsByLang=S.CURR.textsByLang||{en:{},gu:{},hi:{}}; ['en','gu','hi'].forEach(L=>{ S.CURR.textsByLang[L]=Object.assign({},S.CURR.textsByLang[L]||{},S.CURRENT_TEXTS_BY_LANG[L]||{}); }); S.CURR_LANG=S.ADMIN_EDIT_LANG||'en';S.CURR.texts=S.CURR.textsByLang[S.CURR_LANG]||{}; const lt=$('langToggle');if(lt){lt.textContent=S.CURR_LANG==='en'?'EN':(S.CURR_LANG==='gu'?'ગુ':'हि');lt.dataset.state=S.CURR_LANG;} hide($('adminPanel'));S.PREVIEW_MODE=true;S.REQUESTER_MODE=false; await showViewerFor(S.CURRENT_PERSON,true); };
$('adminReset').onclick=async()=>{ if(!confirm('🧹 This deletes ALL people and content from cloud (reviews + 💐 finished ledger stay). Continue?'))return; await sb.wipeAll(T_MEDIA);await sb.wipeAll(T_GIFTS);await sb.wipeAll(T_STORY); await sb.wipeAll(T_EVENTS);await sb.wipeAll(T_VOICE);await sb.wipeAll(T_VIDEO); await sb.wipeAll(T_PINS);await sb.wipeAll(T_PEOPLE);await sb.wipeAll(T_SETTINGS); await sb.wipeAll(T_GUEST); /* T_LEDGER intentionally never wiped — HD0.6 guard in wipeAll */ try{localStorage.clear()}catch(e){} location.reload(); };
$('adminPanelClose').onclick=()=>{hide($('adminPanel'));S.ADMIN_MODE=false;};
$('adminCancel').onclick=()=>{hide($('adminPanel'));S.ADMIN_MODE=false;};

document.querySelectorAll('#adminPanel .panel-tab').forEach(tab=>{
  tab.onclick=()=>{
    document.querySelectorAll('#adminPanel .panel-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('#adminPanel .admin-pane, #adminPanel .panel-pane').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    const p=$(tab.dataset.pane);if(p)p.classList.add('active');
    if(tab.dataset.pane==='pane-guests'){loadGuestApprovals();loadGuestHistory();if(window.bindGuestStatusTabs)bindGuestStatusTabs();if(window.loadAdminFinished)loadAdminFinished();if(window.updateFinishedBadge)updateFinishedBadge();}
    if(tab.dataset.pane==='pane-reviews'){loadReviews();}
    if(tab.dataset.pane==='pane-people'){renderPeopleRepeater();}
  };
});

$('adminExportBtn').onclick=async()=>{
  const st=$('adminDataStatus');st.textContent='⏳ Building…';st.className='panel-status';
  try{
    if(!window.XLSX)throw new Error('XLSX library not loaded.');
    const wb=XLSX.utils.book_new();
    const allPeople=await sb.people()||[];
    const peopleRows=allPeople.map(p=>({id:p.id||'',slug:p.slug||'',display_name:p.display_name||'',birthday:p.birthday||'',password:p.password||'',requester_name:p.requester_name||'',requester_whatsapp:p.requester_whatsapp||'',edit_password:getEditPasswordForPerson(p),wipe_iso:p.wipe_iso||'',enabled:p.enabled!==false?'true':'false',sort_order:p.sort_order||0}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(peopleRows.length?peopleRows:[{slug:'',display_name:''}]),'people');
    const textRows=[],sharedRows=[];
    for(const p of allPeople){
      const s=await sb.getSet(p.id);
      Object.keys(s).forEach(k=>{
        if(k.startsWith('texts__'))textRows.push({person_slug:p.slug||'',key:k.substring(7),value:s[k]});
        else if(k.startsWith('shared__'))sharedRows.push({person_slug:p.slug||'',key:k.substring(8),value:s[k]});
      });
    }
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(textRows.length?textRows:[{person_slug:'',key:'',value:''}]),'texts');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(sharedRows.length?sharedRows:[{person_slug:'',key:'',value:''}]),'shared');
    const giftRows=[];for(const p of allPeople)(await sb.rows(T_GIFTS,p.id)||[]).forEach(g=>giftRows.push({person_slug:p.slug||'',emoji:g.emoji||'',title:g.title||'',message:g.message||'',photo_drive_id:g.photo_drive_id||''}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(giftRows.length?giftRows:[{person_slug:'',emoji:'',title:'',message:'',photo_drive_id:''}]),'gifts');
    const evRows=[];for(const p of allPeople)(await sb.rows(T_EVENTS,p.id)||[]).forEach(e=>evRows.push({person_slug:p.slug||'',icon:e.icon||'',label:e.label||'',target_iso:e.target_iso||''}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(evRows.length?evRows:[{person_slug:'',icon:'',label:'',target_iso:''}]),'events');
    const vcRows=[];for(const p of allPeople)(await sb.rows(T_VOICE,p.id)||[]).forEach(v=>vcRows.push({person_slug:p.slug||'',title:v.title||'',audio_url:v.audio_url||''}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(vcRows.length?vcRows:[{person_slug:'',title:'',audio_url:''}]),'voice');
    const vdRows=[];for(const p of allPeople)(await sb.rows(T_VIDEO,p.id)||[]).forEach(v=>vdRows.push({person_slug:p.slug||'',title:v.title||'',video_url:v.video_url||''}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(vdRows.length?vdRows:[{person_slug:'',title:'',video_url:''}]),'video');
    const pinRows=[];for(const p of allPeople)(await sb.rows(T_PINS,p.id)||[]).forEach(pp=>pinRows.push({person_slug:p.slug||'',label:pp.label||'',lat:pp.lat||'',lng:pp.lng||'',photo_drive_id:pp.photo_drive_id||'',story:pp.story||''}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(pinRows.length?pinRows:[{person_slug:'',label:'',lat:'',lng:'',photo_drive_id:'',story:''}]),'pins');
    const stRows=[];for(const p of allPeople)(await sb.rows(T_STORY,p.id)||[]).forEach(s=>stRows.push({person_slug:p.slug||'',title:s.title||'',body:s.body||'',photo_drive_id:s.photo_drive_id||''}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(stRows.length?stRows:[{person_slug:'',title:'',body:'',photo_drive_id:''}]),'story');
    const mediaRows=(await sb.rows(T_MEDIA)||[]).map(m=>({person_slug:(allPeople.find(p=>p.id===m.person_id)||{}).slug||'',type:m.type||'',src:m.src||'',drive_id:m.drive_id||'',title:m.title||''}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(mediaRows.length?mediaRows:[{person_slug:'',type:'',src:'',drive_id:'',title:''}]),'media');
    const revRows=(S.REVIEWS||[]).map(r=>({person_slug:r.person_slug||'',person_name:r.person_name||'',requester_name:r.requester_name||'',stars:r.stars||0,message:r.message||'',email:r.email||'',created_at:r.created_at||''}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(revRows.length?revRows:[{person_slug:'',person_name:'',requester_name:'',stars:0,message:'',email:'',created_at:''}]),'reviews');
    XLSX.writeFile(wb,'surprise-backup-'+new Date().toISOString().slice(0,10)+'.xlsx');
    st.textContent='✅ Exported.';st.className='panel-status ok';
  }catch(e){console.error(e);st.textContent='❌ '+(e.message||'Export failed');st.className='panel-status err'}
};
$('adminImportBtn').onclick=()=>$('adminExcelInput').click();
$('adminExcelInput').onchange=async(e)=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  const st=$('adminDataStatus');st.textContent='⏳ Reading…';st.className='panel-status';
  try{
    if(!window.XLSX)throw new Error('XLSX library not loaded');
    if(!confirm('Import this file?\n\n• "people" sheet replaces the People list (in memory — click Save).\n• Content sheets apply to the currently-selected person.\n\nContinue?')){st.textContent='';st.className='panel-status';e.target.value='';return}
    const buf=await f.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const readSheet=name=>wb.Sheets[name]?XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:''}):[];
    const has=name=>!!wb.Sheets[name];
    if(has('people')){
      const rows=readSheet('people');
      S.PEOPLE=rows.filter(r=>r.slug||r.display_name).map((r,i)=>({
        id:null,slug:String(r.slug||'').trim()||('person-'+Date.now()+'-'+i),
        display_name:String(r.display_name||'').trim()||('Person '+(i+1)),
        birthday:String(r.birthday||''),password:String(r.password||''),
        requester_name:String(r.requester_name||''),
        requester_whatsapp:String(r.requester_whatsapp||''),
        wipe_iso:String(r.wipe_iso||''),wipe_iso_tz:DEFAULT_TZ,
        enabled:String(r.enabled).toLowerCase()!=='false',sort_order:i
      }));
      S.EXPANDED_PEOPLE.clear();
      renderPeopleRepeater();buildAdminPersonDropdown();
    }
    const cur=S.PEOPLE.find(p=>p.id===S.ADMIN_EDIT_PERSON_ID)||S.CURRENT_PERSON;
    const curSlug=(cur&&cur.slug)||'';
    const matchSlug=row=>{ const rs=String(row.person_slug||'').trim().toLowerCase(); if(!rs)return true; return rs===curSlug.toLowerCase(); };
    const skipped=[];
    if(!cur){ st.textContent='✅ Imported people. Select a person, then re-import to load content.'; st.className='panel-status ok'; e.target.value=''; return; }
    if(has('texts')){
      const rows=readSheet('texts').filter(matchSlug);
      const others=readSheet('texts').filter(r=>!matchSlug(r));
      if(others.length)skipped.push('texts:'+others.length);
      const map={};
      rows.forEach(r=>{ const k=String(r.key||'').trim();if(!k)return; const v=String(r.value==null?'':r.value); map['texts__'+k]=v; });
      const byLang={en:{},gu:{},hi:{}};
      Object.keys(map).forEach(k=>{
        if(!k.startsWith('texts__'))return;
        const rest=k.substring(7);
        const m=rest.match(/^(en|gu|hi)_(.+)$/);
        if(m){ byLang[m[1]][m[2]]=map[k]; }
        else { ['en','gu','hi'].forEach(L=>{ byLang[L][rest]=map[k]; }); }
      });
      S.CURRENT_TEXTS_BY_LANG=byLang;
      applyAdminTextsToFields(S.ADMIN_EDIT_LANG);
    }
    if(has('shared')){
      const rows=readSheet('shared').filter(matchSlug);
      const others=readSheet('shared').filter(r=>!matchSlug(r));
      if(others.length)skipped.push('shared:'+others.length);
      rows.forEach(r=>{ const k=String(r.key||'').trim();if(!k)return; S.CURR.shared[k]=String(r.value==null?'':r.value); });
      fillAdminFields();
    }
    if(has('gifts')){ const rows=readSheet('gifts').filter(matchSlug).filter(r=>r.emoji||r.title||r.message||r.photo_drive_id); S.CURR.gifts=rows.map(r=>({emoji:String(r.emoji||'🎁'),title:String(r.title||''),message:String(r.message||''),photo_drive_id:String(r.photo_drive_id||'')})); renderAdminGifts(); }
    if(has('story')){ const rows=readSheet('story').filter(matchSlug).filter(r=>r.title||r.body||r.photo_drive_id); S.CURR.story=rows.map(r=>({title:String(r.title||''),body:String(r.body||''),photo_drive_id:String(r.photo_drive_id||'')})); renderAdminStory(); }
    if(has('events')){ const rows=readSheet('events').filter(matchSlug).filter(r=>r.icon||r.label||r.target_iso); S.CURR.events=rows.map(r=>({icon:String(r.icon||'📅'),label:String(r.label||''),target_iso:String(r.target_iso||''),target_iso_tz:String(r.target_iso_tz||DEFAULT_TZ)})); renderAdminEvents(); }
    if(has('voice')){ const rows=readSheet('voice').filter(matchSlug).filter(r=>r.title||r.audio_url); S.CURR.voice=rows.map(r=>({title:String(r.title||''),audio_url:String(r.audio_url||'')})); renderAdminVoice(); }
    if(has('video')){ const rows=readSheet('video').filter(matchSlug).filter(r=>r.title||r.video_url); S.CURR.video=rows.map(r=>({title:String(r.title||''),video_url:String(r.video_url||'')})); renderAdminVideo(); }
    if(has('pins')){ const rows=readSheet('pins').filter(matchSlug).filter(r=>r.label||r.lat||r.lng||r.photo_drive_id||r.story); S.CURR.pins=rows.map(r=>({label:String(r.label||''),lat:String(r.lat||''),lng:String(r.lng||''),photo_drive_id:String(r.photo_drive_id||''),story:String(r.story||'')})); renderAdminPins(); }
    if(has('media')){
      const all=readSheet('media').filter(r=>(r.drive_id||r.src));
      const rows=all.filter(matchSlug); const others=all.filter(r=>!matchSlug(r));
      if(others.length)skipped.push('media:'+others.length);
      const rawMedia=rows.map(r=>({type:String(r.type||'photo'),src:String(r.src||''),drive_id:String(r.drive_id||''),title:String(r.title||'')}));
      const before=rawMedia.length; S.CURR.media=dedupeMedia(rawMedia); const removed=before-S.CURR.media.length;
      renderAdminMedia();
      if(removed>0)__showToast('✅ '+S.CURR.media.length+' media row(s) · '+removed+' duplicate removed');
    }
    const msgParts=['✅ Imported content into "'+(cur.display_name||cur.slug)+'".'];
    if(skipped.length)msgParts.push('⚠️ Skipped rows for other people: '+skipped.join(', '));
    msgParts.push('Click 💾 Save to push to cloud.');
    st.textContent=msgParts.join(' '); st.className='panel-status ok';
  }catch(err){console.error(err);st.textContent='❌ '+(err.message||'Import failed');st.className='panel-status err'}
  finally{e.target.value=''}
};

async function loadGuestApprovals(){
  const list=$('pendingGuestsList');if(!list)return;
  list.textContent='Loading…';
  const rows=await sb.guests();
  const pending=(rows||[]).filter(r=>r.status==='pending');
  if(!pending.length){list.innerHTML='<div style="padding:.6rem;color:var(--c-text-muted);">No pending submissions.</div>';return}
  list.innerHTML='';
  const esc=s=>String(s==null?'':s).replace(/</g,'&lt;');
  pending.forEach(r=>{
    const pl=r.payload||{};
    const prop=pl.person_proposal||{};
    const gi=pl.guest_info||{};
    const wa=(r.guest_whatsapp||gi.whatsapp||'').replace(/[^0-9+]/g,'');
    const waLink=wa?('https://wa.me/'+wa.replace(/[^0-9]/g,'')):'';
    const structMedia=(pl.media||[]).filter(m=>m&&(m.drive_id||m.src));
    const mediaIds=String(pl.mediaIds||'').split(',').map(x=>x.trim()).filter(Boolean);
    const dedupCount=dedupeMedia([...structMedia,...mediaIds.map(id=>({drive_id:id}))]).length;
    const gs=pl.shared||{};
    let dateLines='';
    COUNTERS.forEach((c,idx)=>{ const dt=gs[c.dtKey];const tz=gs[c.tzKey]||DEFAULT_TZ; if(dt){ const local=utcToZonedLocal(dt,tz)||''; dateLines+='<div class="detail-row"><strong>Counter '+(idx+1)+':</strong> '+esc(local.replace('T',' '))+' ('+esc(tz)+')</div>'; } });
    if(gs.unlockDateISO){ const tz=gs.unlockDateISO_tz||DEFAULT_TZ; const local=utcToZonedLocal(gs.unlockDateISO,tz)||''; dateLines+='<div class="detail-row"><strong>Unlock:</strong> '+esc(local.replace('T',' '))+' ('+esc(tz)+')</div>'; }
    (pl.events||[]).forEach((ev,i)=>{ if(ev.target_iso){ const tz=ev.target_iso_tz||DEFAULT_TZ; const local=utcToZonedLocal(ev.target_iso,tz)||''; dateLines+='<div class="detail-row"><strong>Event '+(i+1)+' ('+esc(ev.label||'')+'):</strong> '+esc(local.replace('T',' '))+' ('+esc(tz)+')</div>'; } });
    const el=document.createElement('div');el.className='repeat-row';
    el.innerHTML=`<div style="font-size:.85rem;line-height:1.6;">
      <strong>🆕 ${esc(prop.display_name||r.target_person_slug)}</strong>
      <em style="color:var(--c-text-muted);"> (login id: ${esc(prop.slug||r.target_person_slug)})</em><br>
      ${prop.birthday?'🎂 Birthday: '+esc(prop.birthday)+'<br>':''}
      <hr style="border:none;border-top:1px dashed rgba(196,30,58,.25);margin:.4rem 0;">
      <strong>👤 Requested by:</strong> ${esc(gi.name||r.guest_name||'Guest')} ${gi.relation?' ('+esc(gi.relation)+')':''}<br>
      ${wa?'📱 '+esc(wa)+' '+(waLink?'<a href="'+waLink+'" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#25D366;color:#fff;padding:.15rem .55rem;border-radius:40px;font-size:.75rem;text-decoration:none;font-weight:800;">💬 Chat</a>':'')+'<br>':''}
      ${gi.occasion?'🎉 '+esc(gi.occasion)+'<br>':''}
      ${gi.note?'💬 '+esc(gi.note)+'<br>':''}
      <hr style="border:none;border-top:1px dashed rgba(196,30,58,.25);margin:.4rem 0;">
      🎨 Theme: ${esc(pl.theme||'—')} · 🎁 Gifts: ${(pl.gifts||[]).length} · 📖 Story: ${(pl.story||[]).length} · 📅 Events: ${(pl.events||[]).length} · 📸 Media (unique): ${dedupCount} · 🔊 Voice: ${(pl.voice||[]).length} · 🎬 Video: ${(pl.video||[]).length} · 🗺️ Pins: ${(pl.pins||[]).length}
      ${dateLines?('<hr style="border:none;border-top:1px dashed rgba(196,30,58,.25);margin:.4rem 0;"><strong>📅 Dates &amp; times (will be imported):</strong>'+dateLines):''}
    </div>
    <div style="margin-top:.5rem;display:flex;gap:.4rem;flex-wrap:wrap;">
      <button class="panel-btn edit" data-act="edit" data-id="${r.id}" style="min-width:0;padding:.45rem .9rem;font-size:.82rem;">✏️ Edit &amp; Approve</button>
      <button class="repeat-add" data-act="approve" data-id="${r.id}" style="background:#0a7a3d;">✓ Quick Approve</button>
      <button class="repeat-add" data-act="reject" data-id="${r.id}" style="background:#c41e3a;">✕ Reject</button>
    </div>`;
    list.appendChild(el);
  });
  list.querySelectorAll('button[data-act]').forEach(b=>{
    b.onclick=async()=>{
      const id=parseInt(b.dataset.id);const act=b.dataset.act;
      const r=pending.find(x=>x.id===id);if(!r)return;
      if(act==='edit'){ openGuestEditor(r); return; }
      b.disabled=true;window.__showToast('⏳ Working…');
      try{
        if(act==='approve'){
          const result=await approveGuestRow(r,null,false);
          if(result.ok){ const freshPerson=S.PEOPLE.find(p=>p.id===result.personId); if(freshPerson)openShareModal(freshPerson,r); window.__showToast('✅ Approved — person #'+result.personId+' created'); }
          else{ window.__showToast('❌ '+result.err,false);b.disabled=false;return; }
        }else{ await sb.updGuest(id,{status:'rejected'}); window.__showToast('🗑️ Rejected'); }
        loadGuestApprovals();loadGuestHistory();
      }catch(e){window.__showToast('❌ '+e.message,false);b.disabled=false}
    };
  });
}
$('refreshGuests').onclick=loadGuestApprovals;

function geSetLangActive(lang){ GE.lang=lang; document.querySelectorAll('#geLangTabs button').forEach(b=>b.classList.toggle('active',b.dataset.geLang===lang)); applyGETextsToFields(lang); }
function applyGETextsToFields(lang){ const src=(GE.texts&&GE.texts[lang])||{}; document.querySelectorAll('#geTextFields [data-ge-text]').forEach(el=>{ const k=el.dataset.geText;if(!k)return; el.value=src[k]!==undefined?src[k]:''; }); }
function saveGETextsFromFields(){ GE.texts=GE.texts||{en:{},gu:{},hi:{}}; GE.texts[GE.lang]=GE.texts[GE.lang]||{}; document.querySelectorAll('#geTextFields [data-ge-text]').forEach(el=>{ const k=el.dataset.geText;if(!k)return; GE.texts[GE.lang][k]=el.value; }); }
function buildGETextFields(){
  const w=$('geTextFields');if(!w)return;
  if(w.dataset.built==='1')return;
  w.dataset.built='1';
  const groups=[
    {title:'💌 Main Card Text',fields:['pageTitle','mainHeadline','subhead1','subhead2','greeting','msg1','msg2','msg3','msg4','msg5','signoff','namesBadge','fromLabel','countersTitle','ct1_label','ct2_label','ct3_label','openMemoriesBtn','storyBtnText','mapBtnText','uploadBtnText','voiceBtnText','videoBtnText','giftSectionTitle','eventSectionTitle']},
    {title:'🎂 Opening / Cake / Lock',fields:['openLine1','openLine2','cakeHint','lockTitle','lockSubtitle','lockDateText','countdownLabel','daysLabel','hoursLabel','minsLabel','secsLabel','openEarlyText','pwError','pwLockedMsg']},
    {title:'💖 Closing Modal',fields:['closeTitle','close1','close2','close3','close4','closeSignoff','closeBtn']}
  ];
  const longFields=new Set(['msg1','msg2','msg3','msg4','msg5','close1','close2','close3','close4']);
  let html='';
  groups.forEach(g=>{
    html+='<div style="margin-bottom:1rem;"><div class="panel-section-title" style="color:var(--c-primary);">'+g.title+'</div>';
    g.fields.forEach(f=>{ const isLong=longFields.has(f); html+='<div class="panel-field"><label class="panel-label">'+f+'</label>'+(isLong?'<textarea class="panel-textarea" data-ge-text="'+f+'"></textarea>':'<input type="text" class="panel-input" data-ge-text="'+f+'">')+'</div>'; });
    html+='</div>';
  });
  w.innerHTML=html;
}
document.querySelectorAll('#geLangTabs button').forEach(btn=>{ btn.onclick=()=>{ saveGETextsFromFields(); geSetLangActive(btn.dataset.geLang); }; });

function renderGEGifts(){ const w=$('geGiftsRepeater');if(!w)return;w.innerHTML=''; GE.gifts.forEach((g,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Emoji</label><input type="text" class="panel-input" data-gf="emoji" data-i="${i}" value="${(g.emoji||'🎁')}"></div><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gf="title" data-i="${i}" value="${(g.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Message</label><textarea class="panel-textarea" data-gf="message" data-i="${i}">${(g.message||'')}</textarea></div><div class="panel-field"><label class="panel-label">Photo Drive ID (comma-separate for slideshow)</label><input type="text" class="panel-input" data-gf="photo_drive_id" data-i="${i}" value="${(g.photo_drive_id||'')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input,textarea').forEach(el=>{el.oninput=()=>{GE.gifts[+el.dataset.i][el.dataset.gf]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{GE.gifts.splice(+b.dataset.i,1);renderGEGifts()}}); }
$('geAddGiftRow').onclick=()=>{GE.gifts.push({emoji:'🎁',title:'',message:'',photo_drive_id:''});renderGEGifts()};
function renderGEStory(){ const w=$('geStoryRepeater');if(!w)return;w.innerHTML=''; GE.story.forEach((s,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gs="title" data-i="${i}" value="${(s.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Body</label><textarea class="panel-textarea" data-gs="body" data-i="${i}">${(s.body||'')}</textarea></div><div class="panel-field"><label class="panel-label">Photo Drive ID (comma-separate for slideshow)</label><input type="text" class="panel-input" data-gs="photo_drive_id" data-i="${i}" value="${(s.photo_drive_id||'')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input,textarea').forEach(el=>{el.oninput=()=>{GE.story[+el.dataset.i][el.dataset.gs]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{GE.story.splice(+b.dataset.i,1);renderGEStory()}}); }
$('geAddStoryRow').onclick=()=>{GE.story.push({title:'',body:'',photo_drive_id:''});renderGEStory()};
function renderGEEvents(){ const w=$('geEventsRepeater');if(!w)return;w.innerHTML=''; GE.events.forEach((ev,i)=>{const row=document.createElement('div');row.className='repeat-row';
  const tz=ev.target_iso_tz||DEFAULT_TZ; const local=ev.target_iso?utcToZonedLocal(ev.target_iso,tz):'';
  const tzOptsHtml=TZ_OPTIONS.map(o=>`<option value="${o.v}"${o.v===tz?' selected':''}>${o.l}</option>`).join('');
  row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Icon</label><input type="text" class="panel-input" data-ge2="icon" data-i="${i}" value="${(ev.icon||'📅')}"></div><div class="panel-field"><label class="panel-label">Label</label><input type="text" class="panel-input" data-ge2="label" data-i="${i}" value="${(ev.label||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Target date &amp; time + timezone</label><div class="tz-row"><input type="datetime-local" class="panel-input" data-ge2="target_local" data-i="${i}" value="${local}"><select class="panel-select tz-select" data-ge2="target_tz" data-i="${i}">${tzOptsHtml}</select></div></div>`; w.appendChild(row)});
  w.querySelectorAll('input,select').forEach(el=>{
    el.oninput=el.onchange=()=>{
      const i=+el.dataset.i;
      if(el.dataset.ge2==='target_local'){ const tzEl=w.querySelector('.tz-select[data-ge2="target_tz"][data-i="'+i+'"]'); const tz=tzEl?tzEl.value:DEFAULT_TZ; GE.events[i].target_iso=el.value?zonedToUTC(el.value,tz):''; GE.events[i].target_iso_tz=tz; }
      else if(el.dataset.ge2==='target_tz'){ const dtEl=w.querySelector('input[data-ge2="target_local"][data-i="'+i+'"]'); const tz=el.value; GE.events[i].target_iso_tz=tz; if(dtEl&&dtEl.value)GE.events[i].target_iso=zonedToUTC(dtEl.value,tz); }
      else if(el.dataset.ge2){ GE.events[i][el.dataset.ge2]=el.value; }
    };
  });
  w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{GE.events.splice(+b.dataset.i,1);renderGEEvents()}}); }
$('geAddEventRow').onclick=()=>{GE.events.push({icon:'📅',label:'',target_iso:'',target_iso_tz:DEFAULT_TZ});renderGEEvents()};
function renderGEVoice(){ const w=$('geVoiceRepeater');if(!w)return;w.innerHTML=''; GE.voice.forEach((v,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gv="title" data-i="${i}" value="${(v.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Audio URL</label><input type="text" class="panel-input" data-gv="audio_url" data-i="${i}" value="${(v.audio_url||'')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input').forEach(el=>{el.oninput=()=>{GE.voice[+el.dataset.i][el.dataset.gv]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{GE.voice.splice(+b.dataset.i,1);renderGEVoice()}}); }
$('geAddVoiceRow').onclick=()=>{GE.voice.push({title:'',audio_url:''});renderGEVoice()};
function renderGEVideo(){ const w=$('geVideoRepeater');if(!w)return;w.innerHTML=''; GE.video.forEach((v,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gd="title" data-i="${i}" value="${(v.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Video URL</label><input type="text" class="panel-input" data-gd="video_url" data-i="${i}" value="${(v.video_url||'')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input').forEach(el=>{el.oninput=()=>{GE.video[+el.dataset.i][el.dataset.gd]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{GE.video.splice(+b.dataset.i,1);renderGEVideo()}}); }
$('geAddVideoRow').onclick=()=>{GE.video.push({title:'',video_url:''});renderGEVideo()};
function renderGEPins(){ const w=$('gePinsRepeater');if(!w)return;w.innerHTML=''; GE.pins.forEach((p,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Label</label><input type="text" class="panel-input" data-gp="label" data-i="${i}" value="${(p.label||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Lat</label><input type="text" class="panel-input" data-gp="lat" data-i="${i}" value="${p.lat||''}"></div><div class="panel-field"><label class="panel-label">Lng</label><input type="text" class="panel-input" data-gp="lng" data-i="${i}" value="${p.lng||''}"></div><div class="panel-field"><label class="panel-label">Photo IDs (comma-separate for slideshow)</label><input type="text" class="panel-input" data-gp="photo_drive_id" data-i="${i}" value="${(p.photo_drive_id||'')}"></div><div class="panel-field"><label class="panel-label">Story</label><textarea class="panel-textarea" data-gp="story" data-i="${i}">${(p.story||'')}</textarea></div>`; w.appendChild(row)}); w.querySelectorAll('input,textarea').forEach(el=>{el.oninput=()=>{GE.pins[+el.dataset.i][el.dataset.gp]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{GE.pins.splice(+b.dataset.i,1);renderGEPins()}}); }
$('geAddPinRow').onclick=()=>{GE.pins.push({label:'',lat:'',lng:'',photo_drive_id:'',story:''});renderGEPins()};
function renderGEMedia(){ const w=$('geMediaRepeater');if(!w)return;w.innerHTML=''; GE.media.forEach((m,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Type</label><select class="panel-select" data-gm="type" data-i="${i}"><option value="photo"${m.type==='photo'?' selected':''}>Photo</option><option value="video"${m.type==='video'?' selected':''}>Video</option></select></div><div class="panel-field"><label class="panel-label">Drive ID</label><input type="text" class="panel-input" data-gm="drive_id" data-i="${i}" value="${(m.drive_id||'')}"></div><div class="panel-field"><label class="panel-label">Direct URL</label><input type="text" class="panel-input" data-gm="src" data-i="${i}" value="${(m.src||'')}"></div><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gm="title" data-i="${i}" value="${(m.title||'').replace(/"/g,'&quot;')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input,select').forEach(el=>{el.onchange=el.oninput=()=>{GE.media[+el.dataset.i][el.dataset.gm]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{GE.media.splice(+b.dataset.i,1);renderGEMedia()}}); }
$('geAddMediaRow').onclick=()=>{GE.media.push({type:'photo',drive_id:'',src:'',title:''});renderGEMedia()};
$('geBulkAddMedia').onclick=()=>{
  const v=$('ge_bulkMediaIds').value||'';const pb=parseBulkMedia(v);
  if(!pb.total){__showToast('Paste at least one Drive ID or direct link',false);return}
  const before=GE.media.length;
  pb.vids.forEach(m=>GE.media.push(m));
  pb.photos.forEach(m=>GE.media.push(m));
  GE.media=dedupeMedia(GE.media);const removed=(before+pb.total)-GE.media.length;
  renderGEMedia();$('ge_bulkMediaIds').value='';
  __showToast('✅ Added '+pb.vids.length+' video(s) · '+pb.photos.length+' photo(s)'+(removed>0?(' · '+removed+' duplicate(s) removed'):''));
};
function renderGEPrivate(){ const w=$('gePrivateRepeater');if(!w)return;w.innerHTML=''; (GE.privateMedia||[]).forEach((m,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Type</label><select class="panel-select" data-gpm="type" data-i="${i}"><option value="photo"${m.type==='photo'?' selected':''}>Photo</option><option value="video"${m.type==='video'?' selected':''}>Video</option></select></div><div class="panel-field"><label class="panel-label">Drive ID</label><input type="text" class="panel-input" data-gpm="drive_id" data-i="${i}" value="${(m.drive_id||'')}"></div><div class="panel-field"><label class="panel-label">Direct URL</label><input type="text" class="panel-input" data-gpm="src" data-i="${i}" value="${(m.src||'')}"></div><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gpm="title" data-i="${i}" value="${stripPrivTitle(m.title).replace(/"/g,'&quot;')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input,select').forEach(el=>{el.onchange=el.oninput=()=>{GE.privateMedia[+el.dataset.i][el.dataset.gpm]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{GE.privateMedia.splice(+b.dataset.i,1);renderGEPrivate()}}); }
$('geAddPrivateRow').onclick=()=>{GE.privateMedia=GE.privateMedia||[];GE.privateMedia.push({type:'photo',drive_id:'',src:'',title:'',priv:true});renderGEPrivate()};
$('geBulkAddPrivate').onclick=()=>{
  const v=$('ge_bulkPrivateIds').value||'';const pb=parseBulkMedia(v,{priv:true});
  if(!pb.total){__showToast('Paste at least one Drive ID or direct link',false);return}
  GE.privateMedia=GE.privateMedia||[];const before=GE.privateMedia.length;
  pb.vids.forEach(m=>GE.privateMedia.push(m));
  pb.photos.forEach(m=>GE.privateMedia.push(m));
  GE.privateMedia=dedupeMedia(GE.privateMedia);const removed=(before+pb.total)-GE.privateMedia.length;
  renderGEPrivate();$('ge_bulkPrivateIds').value='';
  __showToast('✅ Added '+pb.vids.length+' private video(s) · '+pb.photos.length+' private photo(s)'+(removed>0?(' · '+removed+' duplicate(s) removed'):''));
};
function renderGETheme(){document.querySelectorAll('#geThemeGrid .theme-swatch').forEach(el=>el.classList.toggle('selected',el.dataset.geTheme===GE.theme))}
document.querySelectorAll('#geThemeGrid .theme-swatch').forEach(el=>{el.onclick=()=>{GE.theme=el.dataset.geTheme;renderGETheme()}});
function renderGECounters(){
  [1,2,3].forEach(n=>{ const el=$('ge_ct'+n+'_show'); if(el)el.checked=(String(GE.counters['ct'+n+'_show'])!=='false'); });
  document.querySelectorAll('#ge-pane-counters .ge-ctr-tz').forEach(el=>{ const key=el.dataset.gc;if(!key)return; fillTzSelect(el,GE.counters[key]||DEFAULT_TZ); el.value=GE.counters[key]||DEFAULT_TZ; });
  document.querySelectorAll('#ge-pane-counters .ge-ctr').forEach(el=>{
    const key=el.dataset.gc;if(!key)return;
    if(key.endsWith('_datetime')){ const tzKey=key+'_tz'; const tz=GE.counters[tzKey]||DEFAULT_TZ; el.value=GE.counters[key]?utcToZonedLocal(GE.counters[key],tz):''; }
    else { el.value=GE.counters[key]!==undefined?GE.counters[key]:''; }
  });
}
document.querySelectorAll('#ge-pane-counters .ge-ctr').forEach(el=>{
  const handler=()=>{
    const k=el.dataset.gc;if(!k)return;
    if(k.endsWith('_datetime')){ const tzKey=k+'_tz'; const tzSel=document.querySelector('#ge-pane-counters .ge-ctr-tz[data-gc="'+tzKey+'"]'); const tz=tzSel?tzSel.value:DEFAULT_TZ; GE.counters[k]=el.value?zonedToUTC(el.value,tz):''; }
    else { GE.counters[k]=el.value; }
  };
  el.addEventListener('input',handler);el.addEventListener('change',handler);
});
document.querySelectorAll('#ge-pane-counters .ge-ctr-tz').forEach(el=>{
  el.addEventListener('change',()=>{
    const tzKey=el.dataset.gc;if(!tzKey)return;
    GE.counters[tzKey]=el.value;
    const dtKey=tzKey.replace(/_tz$/,'');
    const dtEl=document.querySelector('#ge-pane-counters .ge-ctr[data-gc="'+dtKey+'"]');
    if(dtEl&&dtEl.value)GE.counters[dtKey]=zonedToUTC(dtEl.value,el.value);
  });
});
[1,2,3].forEach(n=>{ const el=$('ge_ct'+n+'_show'); if(el)el.onchange=()=>{GE.counters['ct'+n+'_show']=el.checked?'true':'false'}; });

document.querySelectorAll('#guestEditModal .panel-tab').forEach(tab=>{
  tab.onclick=()=>{
    document.querySelectorAll('#guestEditModal .panel-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('#guestEditModal .panel-pane').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    const p=$(tab.dataset.gePane);if(p)p.classList.add('active');
  };
});

function openGuestEditor(guestRow){
  const pl=guestRow.payload||{};
  const prop=pl.person_proposal||{};
  const gi=pl.guest_info||{};
  GE.person={ display_name:String(prop.display_name||guestRow.target_person_slug||''), slug:String(prop.slug||guestRow.target_person_slug||'').toLowerCase().replace(/[^a-z0-9\-_]/g,''), birthday:String(prop.birthday||'').slice(0,10) };
  GE.guest={ name:String(gi.name||guestRow.guest_name||''), whatsapp:String(gi.whatsapp||guestRow.guest_whatsapp||''), relation:String(gi.relation||guestRow.guest_relation||''), occasion:String(gi.occasion||''), note:String(gi.note||'') };
  GE.password='';GE.theme=String(pl.theme||'romantic');
  const gs=pl.shared||{};
  GE.counters={};
  COUNTERS.forEach(c=>{
    if(gs[c.labelKey]!==undefined)GE.counters[c.labelKey]=gs[c.labelKey];
    if(gs[c.dtKey]!==undefined)GE.counters[c.dtKey]=gs[c.dtKey];
    if(gs[c.tzKey]!==undefined)GE.counters[c.tzKey]=gs[c.tzKey];
    if(gs[c.dispKey]!==undefined)GE.counters[c.dispKey]=gs[c.dispKey];
    if(gs[c.showKey]!==undefined)GE.counters[c.showKey]=gs[c.showKey];
  });
  if(gs.unlockDateISO!==undefined)GE.counters.unlockDateISO=gs.unlockDateISO;
  if(gs.unlockDateISO_tz!==undefined)GE.counters.unlockDateISO_tz=gs.unlockDateISO_tz;
  GE.texts={en:Object.assign({},pl.texts_en||pl.texts||{}),gu:Object.assign({},pl.texts_gu||{}),hi:Object.assign({},pl.texts_hi||{})};
  GE.gifts=JSON.parse(JSON.stringify(pl.gifts||[]));
  GE.story=JSON.parse(JSON.stringify(pl.story||[]));
  GE.events=JSON.parse(JSON.stringify(pl.events||[]));
  GE.voice=JSON.parse(JSON.stringify(pl.voice||[]));
  GE.video=JSON.parse(JSON.stringify(pl.video||[]));
  GE.pins=JSON.parse(JSON.stringify(pl.pins||[]));
  const allMedia=dedupeMedia((pl.media||[]).filter(m=>m&&(m.drive_id||m.src)).concat(String(pl.mediaIds||'').split(',').map(x=>x.trim()).filter(Boolean).map(id=>({type:'photo',drive_id:id,src:'',title:''}))));
  const spGE=splitMedia(allMedia);
  GE.media=spGE.pub;
  GE.privateMedia=spGE.priv.map(m=>Object.assign({},m,{priv:true}));
  if(!GE.privateMedia.length){
    const pStruct=(pl.privateMedia||[]).filter(m=>m&&(m.drive_id||m.src));
    const pFlat=String(pl.privateMediaIds||'').split(',').map(x=>x.trim()).filter(Boolean).map(id=>({type:'photo',drive_id:id,src:'',title:''}));
    GE.privateMedia=dedupeMedia(pStruct.concat(pFlat)).map(m=>Object.assign({},m,{priv:true}));
  }
  GE.guestRow=guestRow;
  document.querySelectorAll('#ge-pane-person .ge-person').forEach(el=>{ const k=el.dataset.gp;if(!k)return; el.value=GE.person[k]!==undefined?GE.person[k]:''; });
  document.querySelectorAll('#ge-pane-person .ge-guest').forEach(el=>{ const k=el.dataset.gg;if(!k)return; el.value=GE.guest[k]!==undefined?GE.guest[k]:''; });
  $('ge_password').value='';
  $('ge_editpw_preview').value=makeRequesterEditPassword(GE.guest.name,GE.guest.whatsapp,GE.person.slug);
  const gpoEl=$('ge_private_otp_preview');if(gpoEl)gpoEl.value=makePrivateOtp($('ge_editpw_preview').value)||'';
  buildGETextFields();
  geSetLangActive('en');
  renderGETheme();
  renderGECounters();
  renderGEGifts();renderGEStory();renderGEEvents();
  renderGEVoice();renderGEVideo();renderGEPins();renderGEMedia();renderGEPrivate();
  $('ge_bulkMediaIds').value='';$('ge_bulkPrivateIds').value='';
  document.querySelectorAll('#guestEditModal .panel-tab').forEach((t,i)=>t.classList.toggle('active',i===0));
  document.querySelectorAll('#guestEditModal .panel-pane').forEach((p,i)=>p.classList.toggle('active',i===0));
  txt($('guestEditSub'),'Editing submission from '+(GE.guest.name||'guest')+(GE.guest.whatsapp?' ('+GE.guest.whatsapp+')':'')+' — change anything before approving.');
  const st=$('geStatus');if(st){st.textContent='';st.className='panel-status'}
  show($('guestEditModal'));
}
$('guestEditClose').onclick=()=>hide($('guestEditModal'));
$('geCancel').onclick=()=>hide($('guestEditModal'));

function collectGE(){
  saveGETextsFromFields();
  document.querySelectorAll('#ge-pane-person .ge-person').forEach(el=>{ const k=el.dataset.gp;if(!k)return; GE.person[k]=el.value; });
  document.querySelectorAll('#ge-pane-person .ge-guest').forEach(el=>{ const k=el.dataset.gg;if(!k)return; GE.guest[k]=el.value; });
  GE.person.slug=String(GE.person.slug||'').toLowerCase().replace(/[^a-z0-9\-_]/g,'');
  GE.person.birthday=String(GE.person.birthday||'').slice(0,10);
  GE.password=$('ge_password').value.trim();
  // 🔒 View Key: enforce same rules as Edit Key — uppercase, max 8 characters; auto-generate when blank
  if(GE.password){
    const normV=normalizeViewPw(GE.password);
    GE.password=normV; $('ge_password').value=normV;
  } else {
    const autoV=ensureUniqueViewPw(makeViewerPassword(GE.person.display_name,GE.person.birthday,GE.person.slug),S.PEOPLE);
    if(autoV){GE.password=autoV;$('ge_password').value=autoV;}
  }
  $('ge_editpw_preview').value=makeRequesterEditPassword(GE.guest.name,GE.guest.whatsapp,GE.person.slug);
  const gpoEl=$('ge_private_otp_preview');if(gpoEl)gpoEl.value=makePrivateOtp($('ge_editpw_preview').value)||'';
}
function buildGEPayload(){
  const sharedOut={};
  COUNTERS.forEach(c=>{
    sharedOut[c.labelKey]=GE.counters[c.labelKey]!==undefined?GE.counters[c.labelKey]:(GE.texts.en[c.labelKey]||'');
    sharedOut[c.dtKey]=GE.counters[c.dtKey]||'';
    sharedOut[c.tzKey]=GE.counters[c.tzKey]||DEFAULT_TZ;
    sharedOut[c.dispKey]=GE.counters[c.dispKey]||'';
    sharedOut[c.showKey]=GE.counters[c.showKey]!==undefined?GE.counters[c.showKey]:'true';
  });
  if(GE.counters.unlockDateISO!==undefined)sharedOut.unlockDateISO=GE.counters.unlockDateISO;
  if(GE.counters.unlockDateISO_tz!==undefined)sharedOut.unlockDateISO_tz=GE.counters.unlockDateISO_tz;
  return {
    person_proposal:{display_name:GE.person.display_name,slug:GE.person.slug,birthday:GE.person.birthday},
    guest_info:{name:GE.guest.name,relation:GE.guest.relation,occasion:GE.guest.occasion,note:GE.guest.note,whatsapp:GE.guest.whatsapp},
    texts_en:GE.texts.en||{},texts_gu:GE.texts.gu||{},texts_hi:GE.texts.hi||{},
    texts:GE.texts.en||{},
    shared:sharedOut,
    theme:GE.theme,gifts:GE.gifts,story:GE.story,events:GE.events,
    voice:GE.voice,video:GE.video,pins:GE.pins,
    media:dedupeMedia((GE.media||[]).concat(GE.privateMedia||[])),
    mediaIds:dedupeMedia((GE.media||[]).concat(GE.privateMedia||[])).map(m=>m.drive_id).filter(Boolean).join(', '),
    privateMedia:(GE.privateMedia||[]).map(m=>Object.assign({},m,{priv:true,title:privTitle(stripPrivTitle(m.title))})),
    privateMediaIds:(GE.privateMedia||[]).map(m=>m.drive_id).filter(Boolean).join(', ')
  };
}
$('geSaveDraft').onclick=async()=>{
  const st=$('geStatus');
  collectGE();
  if(!GE.person.display_name||!GE.person.slug){ st.textContent='❌ Display Name and Slug required.'; st.className='panel-status err'; return; }
  st.textContent='⏳ Saving edits…';st.className='panel-status';
  try{
    const payload=buildGEPayload();
    await sb.updGuest(GE.guestRow.id,{ guest_name:GE.guest.name, guest_relation:GE.guest.relation, guest_whatsapp:GE.guest.whatsapp, target_person_slug:GE.person.slug, payload });
    st.textContent='✅ Edits saved (still pending).';st.className='panel-status ok';
    __showToast('💾 Guest submission updated');
    loadGuestApprovals();
  }catch(e){ st.textContent='❌ '+e.message;st.className='panel-status err'; }
};
$('geApprove').onclick=async()=>{
  const st=$('geStatus');
  collectGE();
  if(!GE.person.display_name){ st.textContent='❌ Display Name required.'; st.className='panel-status err'; return; }
  if(!GE.person.slug){ st.textContent='❌ Login ID / Slug required.'; st.className='panel-status err'; return; }
  const dupe=S.PEOPLE.find(p=>p.slug&&p.slug.toLowerCase()===GE.person.slug.toLowerCase());
  if(dupe){ st.textContent='❌ Login ID "'+GE.person.slug+'" is already taken.'; st.className='panel-status err'; return; }
  st.textContent='⏳ Approving…';st.className='panel-status';
  const editedRow=Object.assign({},GE.guestRow,{ guest_name:GE.guest.name, guest_relation:GE.guest.relation, guest_whatsapp:GE.guest.whatsapp, target_person_slug:GE.person.slug, payload:buildGEPayload() });
  try{
    const result=await approveGuestRow(editedRow,GE.password||null,false);
    if(result.ok){
      st.textContent='✅ Approved — person #'+result.personId;st.className='panel-status ok';
      hide($('guestEditModal'));
      const freshPerson=S.PEOPLE.find(p=>p.id===result.personId);
      if(freshPerson)openShareModal(freshPerson,editedRow);
      __showToast('✅ Approved & person #'+result.personId+' created');
      loadGuestApprovals();loadGuestHistory();
    }else{ st.textContent='❌ '+result.err;st.className='panel-status err'; }
  }catch(e){ st.textContent='❌ '+e.message;st.className='panel-status err'; }
};

// FIX 6: guard for missing row
async function approveGuestRow(r,overridePassword,skipStatusUpdate){
  try{
    if(!r || typeof r!=='object') return { ok:false, err:'No guest row provided' };
    const pl=r.payload||{};
    const prop=pl.person_proposal||{};
    const gi=pl.guest_info||{};
    const display_name=(prop.display_name||'').trim();
    let slug=(prop.slug||r.target_person_slug||'').trim().toLowerCase().replace(/[^a-z0-9\-_]/g,'');
    const birthday=(prop.birthday||'').trim();
    if(!display_name||!slug)return{ok:false,err:'Missing name/slug'};
    const freshPeople=await sb.people()||[];
    if(freshPeople.find(p=>p.slug===slug))slug=slug+'-'+Math.floor(Math.random()*1000);
    let password=overridePassword?normalizeViewPw(overridePassword):'';
    if(!password){
      // 🔒 View Key — same rules as Edit Key: auto-generated, unique, max 8 characters
      password=ensureUniqueViewPw(makeViewerPassword(display_name,birthday,slug),freshPeople);
    }
    const row={slug,display_name,birthday:birthday||null,password,wipe_iso:null,enabled:true,sort_order:freshPeople.length,requester_name:(gi.name||r.guest_name||'').trim(),requester_whatsapp:(gi.whatsapp||r.guest_whatsapp||'').trim()};
    let newPersonId=null;
    try{const rr=await sb.insPerson(row);if(rr&&rr[0]&&rr[0].id)newPersonId=rr[0].id}
    catch(e){delete row.wipe_iso;delete row.birthday;delete row.requester_name;delete row.requester_whatsapp;const rr=await sb.insPerson(row);if(rr&&rr[0]&&rr[0].id)newPersonId=rr[0].id}
    if(!newPersonId)return{ok:false,err:'Could not create person'};
    const settings={};
    const en=pl.texts_en||pl.texts||{};
    const gu=pl.texts_gu||{};
    const hi=pl.texts_hi||{};
    TEXT_FIELDS.forEach(f=>{ settings['texts__en_'+f]=en[f]!==undefined?en[f]:''; settings['texts__gu_'+f]=gu[f]!==undefined?gu[f]:''; settings['texts__hi_'+f]=hi[f]!==undefined?hi[f]:''; });
    if(pl.theme)settings['shared__theme']=pl.theme;
    settings['shared__defaultLang']='en';
    settings['shared__enableStory']='true';settings['shared__enableGiftBox']='true';settings['shared__enableEventCount']='true';
    settings['shared__enableVoiceMsg']='true';settings['shared__enableVideoMsg']='true';settings['shared__enableMap']='true';
    const gs=pl.shared||{};
    COUNTERS.forEach(c=>{
      if(gs[c.labelKey]!==undefined)settings['shared__'+c.labelKey]=gs[c.labelKey];
      if(gs[c.dtKey]!==undefined)settings['shared__'+c.dtKey]=gs[c.dtKey];
      if(gs[c.tzKey]!==undefined)settings['shared__'+c.tzKey]=gs[c.tzKey];
      if(gs[c.dispKey]!==undefined)settings['shared__'+c.dispKey]=gs[c.dispKey];
      if(gs[c.showKey]!==undefined)settings['shared__'+c.showKey]=gs[c.showKey];
    });
    if(gs.unlockDateISO!==undefined)settings['shared__unlockDateISO']=gs.unlockDateISO;
    if(gs.unlockDateISO_tz!==undefined)settings['shared__unlockDateISO_tz']=gs.unlockDateISO_tz;
    ['enableFireworks','enableUpload','showLockScreen','music_mode','vol_card','vol_slide','vol_private','vol_video',
     'pinSlideshowEnabled','pinSlideDuration','pinSlideDefaultSec','storySlideshowEnabled','storySlideDuration','storySlideDefaultSec',
     'photoDurationSec','shuffleMusicOn','shuffleMediaOn','musicOrder','mediaOrder',
     'slideEffectsEnabled','effectsIntensity','floatersEnabled','floaterDensity',
     'song1_on','song1_url','song1_where','song2_on','song2_url','song2_where',
     'song3_on','song3_url','song3_where','song4_on','song4_url','song4_where',
     'song5_on','song5_url','song5_where','privateMediaOrder'].forEach(k=>{ if(gs[k]!==undefined)settings['shared__'+k]=gs[k]; });
    await sb.upSet(settings,newPersonId);
    const tasks=[];
    const giftRows=(pl.gifts||[]).filter(g=>g.title||g.message||g.photo_drive_id).map(g=>({person_id:newPersonId,emoji:g.emoji||'🎁',title:g.title||'',message:g.message||'',photo_drive_id:g.photo_drive_id||''}));
    if(giftRows.length)tasks.push(sb.insBatch(T_GIFTS,giftRows));
    const stRows=(pl.story||[]).filter(s=>s.title||s.body).map(s=>({person_id:newPersonId,title:s.title||'',body:s.body||'',photo_drive_id:s.photo_drive_id||''}));
    if(stRows.length)tasks.push(sb.insBatch(T_STORY,stRows));
    const evRows=(pl.events||[]).filter(e=>e.label||e.target_iso).map(e=>({person_id:newPersonId,icon:e.icon||'📅',label:e.label||'',target_iso:e.target_iso||''}));
    if(evRows.length)tasks.push(sb.insBatch(T_EVENTS,evRows));
    const vcRows=(pl.voice||[]).filter(v=>v.audio_url).map(v=>({person_id:newPersonId,title:v.title||'',audio_url:v.audio_url||''}));
    if(vcRows.length)tasks.push(sb.insBatch(T_VOICE,vcRows));
    const vdRows=(pl.video||[]).filter(v=>v.video_url).map(v=>({person_id:newPersonId,title:v.title||'',video_url:v.video_url||''}));
    if(vdRows.length)tasks.push(sb.insBatch(T_VIDEO,vdRows));
    const pinRows=(pl.pins||[]).filter(p=>p.lat&&p.lng).map(p=>({person_id:newPersonId,label:p.label||'',lat:p.lat,lng:p.lng,photo_drive_id:p.photo_drive_id||'',story:p.story||''}));
    if(pinRows.length)tasks.push(sb.insBatch(T_PINS,pinRows));
    const structMedia=(pl.media||[]).filter(m=>m&&(m.drive_id||m.src));
    const flatMedia=String(pl.mediaIds||'').split(',').map(x=>x.trim()).filter(Boolean).map(id=>({type:'photo',drive_id:id,src:'',title:''}));
    let uniqueMedia=dedupeMedia([...structMedia,...flatMedia]);
    // merge any separately-listed private media (older payloads) so nothing is lost
    const pStruct=(pl.privateMedia||[]).filter(m=>m&&(m.drive_id||m.src));
    const pFlat=String(pl.privateMediaIds||'').split(',').map(x=>x.trim()).filter(Boolean).map(id=>({type:'photo',drive_id:id,src:'',title:'',priv:true}));
    const pAll=dedupeMedia([...pStruct,...pFlat]);
    const seenKeys=new Set(uniqueMedia.map(m=>(m.drive_id||m.src||'').trim().toLowerCase()));
    pAll.forEach(m=>{ const k=(m.drive_id||m.src||'').trim().toLowerCase(); if(!seenKeys.has(k)){seenKeys.add(k);uniqueMedia.push(m);} });
    const mediaRows=uniqueMedia.map(m=>{ const row={person_id:newPersonId,type:m.type||'photo',drive_id:m.drive_id||'',src:m.src||'',title:m.title||'',sort_order:0}; if(isPrivateRow(m))row.priv=true; return row; });
    if(mediaRows.length)tasks.push(sb.insBatch(T_MEDIA,mediaRows));
    await Promise.all(tasks);
    const shareLink=buildCardLink(slug);
    if(r.id){
      const patch={status:'approved',approved_person_id:newPersonId,approved_login_id:slug,approved_password:password,approved_share_link:shareLink,approved_at:new Date().toISOString()};
      if(skipStatusUpdate)patch.payload=pl;
      await sb.updGuest(r.id,patch);
    }
    S.PEOPLE=await sb.people()||[];
    if(window.buildHome)window.buildHome();
    renderPeopleRepeater();buildAdminPersonDropdown();
    return{ok:true,personId:newPersonId,password,slug};
  }catch(e){ return{ok:false,err:e.message||'Approval failed'}; }
}

// Selection bar helpers (defined before loadGuestHistory so the empty-state early return can call them)
window.updateCompletedSelBar=function(){
  const list=$('guestHistoryList');if(!list)return;
  const bs=Array.from(list.querySelectorAll('.completed-check'));
  const selCount=$('completedSelCount'),selAll=$('selectAllCompleted');
  const n=bs.filter(x=>x.checked).length;
  if(selCount)selCount.textContent=n+' selected';
  if(selAll){selAll.checked=bs.length>0&&n===bs.length;selAll.indeterminate=n>0&&n<bs.length;}
};
window.updateFinSelBar=function(){
  const list=$('adminFinishedList');if(!list)return;
  const bs=Array.from(list.querySelectorAll('.finished-check'));
  const bar=$('finishedSelectedActions'),cnt=$('finishedSelCount'),btn=$('removeSelectedFromFinished');
  const n=bs.filter(x=>x.checked).length;
  if(bar)bar.style.display=n?'':'none';
  if(cnt)cnt.textContent=n+' selected';
  if(btn)btn.textContent='🗑️ Remove '+n+' from home screen';
};
async function loadGuestHistory(){
  const list=$('guestHistoryList');if(!list)return;
  list.textContent='Loading…';
  // HD1.1: refresh the cloud ledger + people first so "awaiting finish" flags are accurate
  try{ await pullFinishedLedger(); }catch(e){}
  try{ S.PEOPLE=await sb.people()||S.PEOPLE; }catch(e){}
  const rows=(await sb.guests())||[];
  const approved=rows.filter(r=>r.status==='approved');
  const nowMs=Date.now();
  // dueSlugs: every live person whose auto-wipe date has passed
  const dueSlugs={};
  (S.PEOPLE||[]).forEach(p=>{
    if(!p.wipe_iso)return;
    const d=new Date(p.wipe_iso);
    if(!isNaN(d.getTime())&&d.getTime()<=nowMs)dueSlugs[String(p.slug||'').toLowerCase()]=true;
  });
  const slugOf=r=>{
    const pl=r.payload||{};const prop=pl.person_proposal||{};
    return String(r.approved_login_id||prop.slug||r.target_person_slug||'').toLowerCase();
  };
  // R2: isDue rules — amber 🕊️ AUTO-WIPED · awaiting 💐 Finished row
  const isDue=r=>{
    const slug=slugOf(r);
    if(isFinishedSlug(slug))return false; // rows already on the Finished ledger are NEVER due
    if(dueSlugs[slug])return true;
    const stillExists=(S.PEOPLE||[]).some(p=>String(p.slug||'').toLowerCase()===slug);
    if(!stillExists){
      const pl=r.payload||{};const prop=pl.person_proposal||{};
      const w=r.wipe_iso||prop.wipe_iso||null;
      if(w){const d=new Date(w);if(!isNaN(d.getTime())&&d.getTime()<=nowMs)return true;}
    }
    return false;
  };
  // Sort: due (awaiting-finish) rows float to the TOP
  approved.sort((a,b)=>(isDue(b)?1:0)-(isDue(a)?1:0));
  if(!approved.length){list.innerHTML='<div style="padding:.6rem;color:var(--c-text-muted);">No completed submissions yet.</div>';updateCompletedSelBar();return}
  list.innerHTML='';
  const esc=s=>String(s==null?'':s).replace(/</g,'&lt;');
  approved.forEach(r=>{
    const due=isDue(r);
    const pl=r.payload||{};
    const prop=pl.person_proposal||{};
    const gi=pl.guest_info||{};
    const wa=(r.guest_whatsapp||gi.whatsapp||'').replace(/[^0-9+]/g,'');
    const waLink=wa?('https://wa.me/'+wa.replace(/[^0-9]/g,'')):'';
    const created=r.created_at?new Date(r.created_at).toLocaleString():'';
    const loginId=r.approved_login_id||prop.slug||r.target_person_slug||'';
    const pwd=r.approved_password||'';
    const link=(loginId?buildCardLink(loginId):getPublicCardLink())||r.approved_share_link||buildCardLink(loginId);
    const sentAt=r.approved_at?new Date(r.approved_at).toLocaleString():'';
    const editPw=makeRequesterEditPassword(gi.name||r.guest_name,gi.whatsapp||r.guest_whatsapp,loginId);
    const el=document.createElement('div');el.className='repeat-row guest-row'+(due?' awaiting-finish':'');
    el.style.background=due?'linear-gradient(135deg,#fff7e0,#ffedc2)':'linear-gradient(135deg,#f0fff4,#e8f5f0)';
    el.innerHTML=`<label style="position:absolute;top:.55rem;left:.55rem;z-index:2;" title="Select for bulk actions"><input type="checkbox" class="guest-check completed-check" data-id="${r.id}" onclick="event.stopPropagation()"></label>
    <div style="font-size:.85rem;line-height:1.6;padding-left:1.4rem;">
      <strong>${due?'🕊️':'✅'} ${esc(prop.display_name||r.target_person_slug)}</strong>${due?' <span class="person-id-pill" style="background:#fff3cd;color:#b26a00;border-color:#b26a00;">AUTO-WIPED · awaiting 💐 Finished</span>':''}
      ${r.approved_person_id?' <span class="person-id-pill">#'+r.approved_person_id+'</span>':''}
      <em style="color:var(--c-text-muted);"> (login id: ${esc(loginId)})</em>
      ${prop.birthday?'<div style="font-size:.78rem;">🎂 Birthday: '+esc(String(prop.birthday).slice(0,10))+'</div>':''}
      ${created?'<div style="font-size:.75rem;color:var(--c-text-muted);font-style:italic;">Submitted: '+esc(created)+'</div>':''}
      ${sentAt?'<div style="font-size:.75rem;color:var(--c-text-muted);font-style:italic;">Shared at: '+esc(sentAt)+'</div>':''}
      <hr style="border:none;border-top:1px dashed rgba(196,30,58,.25);margin:.4rem 0;">
      <strong>👤 Requester:</strong> ${esc(gi.name||r.guest_name||'Guest')} ${gi.relation?' ('+esc(gi.relation)+')':''}<br>
      ${wa?'📱 '+esc(wa)+' '+(waLink?'<a href="'+waLink+'" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#25D366;color:#fff;padding:.15rem .55rem;border-radius:40px;font-size:.75rem;text-decoration:none;font-weight:800;">💬 Chat</a>':'')+'<br>':''}
      ${gi.occasion?'🎉 '+esc(gi.occasion)+'<br>':''}
      ${gi.note?'💬 '+esc(gi.note)+'<br>':''}
      <hr style="border:none;border-top:1px dashed rgba(196,30,58,.25);margin:.4rem 0;">
      <div><strong>🔑 Login ID:</strong> <code style="background:#fff;padding:.15rem .45rem;border-radius:.35rem;font-family:monospace;">${esc(loginId)}</code></div>
      ${pwd?'<div><strong>🔒 View Key:</strong> <code style="background:#fff;padding:.15rem .45rem;border-radius:.35rem;font-family:monospace;">'+esc(pwd)+'</code></div>':''}
      ${editPw?'<div><strong>✏️ Edit Key:</strong> <code style="background:#eef3ff;padding:.15rem .45rem;border-radius:.35rem;font-family:monospace;color:#1a3d8f;">'+esc(editPw)+'</code></div>':''}
      <div><strong>🌐 Link:</strong> <a href="${link}" target="_blank" rel="noopener noreferrer" style="color:#0a4f8f;word-break:break-all;">${link}</a></div>
    </div>
    <div style="margin-top:.5rem;display:flex;gap:.4rem;flex-wrap:wrap;">
      <button type="button" class="repeat-add finished-move-btn" data-id="${r.id}" style="background:#8e44ad;">💐 Move to Finished</button>
      <button class="repeat-add reedit-btn" data-id="${r.id}" style="background:#2a5fd1;">✏️ Re-edit submission</button>
      <button class="repeat-add resend-btn" data-id="${r.id}" style="background:linear-gradient(135deg,#25D366,#128C7E);">📲 Re-send credentials</button>
      <button type="button" class="repeat-add comp-del-btn" data-id="${r.id}" style="background:#c0392b;">🗑️ Delete from database</button>
    </div>`;
    list.appendChild(el);
  });
  list.querySelectorAll('.resend-btn').forEach(b=>{
    b.onclick=()=>{
      const r=approved.find(x=>x.id===parseInt(b.dataset.id));if(!r)return;
      const person=S.PEOPLE.find(p=>(p.id===r.approved_person_id)||(p.slug===r.approved_login_id));
      if(!person){__showToast('⚠️ Person no longer exists',false);return}
      openShareModal(person,r);
    };
  });
  list.querySelectorAll('.reedit-btn').forEach(b=>{
    b.onclick=()=>{
      const r=approved.find(x=>x.id===parseInt(b.dataset.id));if(!r)return;
      if(!confirm('Re-edit this submission?\n\nApproving again will create a NEW person.\n\nContinue?'))return;
      openGuestEditor(r);
    };
  });
  // per-row Move-to-Finished
  list.querySelectorAll('.finished-move-btn').forEach(b=>{
    b.onclick=()=>moveCompletedGuestsToFinished([parseInt(b.dataset.id)]);
  });
  // per-row Delete-from-database
  list.querySelectorAll('.comp-del-btn').forEach(b=>{
    b.onclick=()=>deleteCompletedGuestsFromDb([parseInt(b.dataset.id)]);
  });
  // Selection bar wiring (bound once via dataset._bound — lists re-render often)
  const boxes=()=>Array.from(list.querySelectorAll('.completed-check'));
  const selCount=$('completedSelCount'),selAll=$('selectAllCompleted');
  boxes().forEach(cb=>{cb.onchange=updateCompletedSelBar});
  if(selAll&&selAll.dataset._bound!=='1'){
    selAll.dataset._bound='1';
    selAll.onchange=()=>{boxes().forEach(cb=>{cb.checked=selAll.checked});updateCompletedSelBar()};
  }
  const mv=$('moveSelectedToFinished');
  if(mv&&mv.dataset._bound!=='1'){
    mv.dataset._bound='1';
    mv.onclick=()=>{const ids=boxes().filter(x=>x.checked).map(x=>parseInt(x.dataset.id));moveCompletedGuestsToFinished(ids)};
  }
  const dl=$('deleteSelectedFromDb');
  if(dl&&dl.dataset._bound!=='1'){
    dl.dataset._bound='1';
    dl.onclick=()=>{const ids=boxes().filter(x=>x.checked).map(x=>parseInt(x.dataset.id));deleteCompletedGuestsFromDb(ids)};
  }
  updateCompletedSelBar();
}
$('refreshGuestHistory').onclick=loadGuestHistory;

// ===== 💐 FINISHED FEATURE (HD0.5 / HD0.6 / HD1.1) =====
// Storage keys (§7.1)
const FINISHED_KEY='surprise_finished_people_v1';        // local mirror of the cloud ledger (cap 200)
const FINISHED_PURGED_KEY='surprise_finished_purged_v1'; // delete tombstones (cap 400)
const WIPED_ARCHIVE_KEY='surprise_wiped_archive_v1';     // private archive (cap 500)
const FINISHED_LEDGER_SETTING='shared__finished_ledger'; // settings-table mirror key

// Self-healing RPC: recreate table/policies/bucket if missing (setup/ledger.sql §5)
window.LEDGER_SETUP_SQL="-- 💐 Finished Ledger setup (run once in Supabase SQL Editor)\ncreate table if not exists public.finished_ledger(id int primary key default 1, value text, updated_at timestamptz default now());\ninsert into public.finished_ledger(id,value) values(1,'{\"people\":[]}') on conflict do nothing;\nalter table public.finished_ledger enable row level security;\ncreate policy if not exists ledger_read on public.finished_ledger for select using(true) to anon,authenticated;\ncreate policy if not exists ledger_insert on public.finished_ledger for insert with check(true) to anon,authenticated;\ncreate policy if not exists ledger_update on public.finished_ledger for update using(true) with check(true) to anon,authenticated;";
let _ledgerTableState=null; // tri-state cache: true / false / in-flight Promise
async function sbEnsureLedgerTable(){
  if(_ledgerTableState===true)return true;
  if(_ledgerTableState instanceof Promise)return _ledgerTableState;
  _ledgerTableState=(async()=>{
    try{
      const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/ensure_finished_ledger_table`,{method:'POST',headers:sb.h(),body:'{}'});
      _ledgerTableState=r.ok;
      return r.ok;
    }catch(e){_ledgerTableState=false;return false}
  })();
  return _ledgerTableState;
}

// §7.3 helpers
function daysUntilBirthday(birthday){
  if(!birthday)return null;
  const b=new Date(String(birthday).slice(0,10)+'T00:00:00');
  if(isNaN(b.getTime()))return null;
  const today=new Date();today.setHours(0,0,0,0);
  let next=new Date(today.getFullYear(),b.getMonth(),b.getDate());
  if(next<today)next=new Date(today.getFullYear()+1,b.getMonth(),b.getDate());
  return Math.round((next-today)/86400000);
}
function formatBirthdayDate(birthday){
  if(!birthday)return '';
  const b=new Date(String(birthday).slice(0,10)+'T00:00:00');
  if(isNaN(b.getTime()))return '';
  const today=new Date();today.setHours(0,0,0,0);
  let next=new Date(today.getFullYear(),b.getMonth(),b.getDate());
  if(next<today)next=new Date(today.getFullYear()+1,b.getMonth(),b.getDate());
  try{return next.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}catch(e){return next.toISOString().slice(0,10)}
}
function lsGetArr(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
function lsSetArr(key,arr,cap){try{localStorage.setItem(key,JSON.stringify((arr||[]).slice(0,cap)))}catch(e){}}
function getPurgedSlugs(){const m={};getPurgedList().forEach(t=>{if(t&&t.slug)m[String(t.slug).toLowerCase()]=t});return m}
function getPurgedList(){return lsGetArr(FINISHED_PURGED_KEY)}
function isPurged(slug){const s=String(slug||'').toLowerCase();return !!getPurgedSlugs()[s]}
function rememberPurged(tomb){
  const list=getPurgedList().filter(x=>String(x.slug||'').toLowerCase()!==String(tomb.slug||'').toLowerCase());
  list.unshift(tomb);lsSetArr(FINISHED_PURGED_KEY,list,400);
}
function forgetPurged(slug){
  const s=String(slug||'').toLowerCase();
  lsSetArr(FINISHED_PURGED_KEY,getPurgedList().filter(x=>String(x.slug||'').toLowerCase()!==s),400);
}
function isFinishedSlug(slug){
  const s=String(slug||'').toLowerCase();
  if(!s)return false;
  if(isPurged(s))return false; // R13/R14: purged slugs are NOT finished
  return getFinishedPeople().some(p=>String(p.slug||'').toLowerCase()===s);
}
function isAwaitingFinish(row){
  if(!row||row.status!=='approved')return false;
  const pl=row.payload||{};const prop=pl.person_proposal||{};
  const w=row.wipe_iso||prop.wipe_iso||null;
  if(!w)return false;
  const d=new Date(w);if(isNaN(d.getTime()))return false;
  const slug=String(row.approved_login_id||prop.slug||row.target_person_slug||'').toLowerCase();
  return d.getTime()<=Date.now()&&!isFinishedSlug(slug);
}
function findPersonBySlug(slug){
  const s=String(slug||'').toLowerCase();
  const p=(S.PEOPLE||[]).find(x=>String(x.slug||'').toLowerCase()===s);
  if(p)return p;
  return getFinishedPeople().find(x=>String(x.slug||'').toLowerCase()===s)||null;
}
function getFinishedPeople(){
  return lsGetArr(FINISHED_KEY).filter(p=>p&&p.slug&&!p.deleted);
}
function clearFinishedPeople(){try{localStorage.removeItem(FINISHED_KEY)}catch(e){}}
// mergeTwoListsRaw: dedupe by slug; deleted:true always wins; earliest wiped_at wins; newest-first; cap 400
function mergeTwoListsRaw(a,b){
  const map={};
  const put=e=>{
    if(!e||!e.slug)return;
    const k=String(e.slug).toLowerCase();
    const old=map[k];
    if(!old){map[k]=e;return}
    if(old.deleted&&!e.deleted){map[k]=old;return}
    if(e.deleted&&!old.deleted){map[k]=Object.assign({},e,{wiped_at:earliestWiped(old,e)});return}
    map[k]=Object.assign({},old,e,{wiped_at:earliestWiped(old,e)});
  };
  (a||[]).forEach(put);(b||[]).forEach(put);
  const arr=Object.values(map);
  arr.sort((x,y)=>{const wx=x.wiped_at?new Date(x.wiped_at).getTime():0;const wy=y.wiped_at?new Date(y.wiped_at).getTime():0;return wy-wx});
  return arr.slice(0,400);
}
function earliestWiped(old,e){
  const t=o=>{const d=o&&o.wiped_at?new Date(o.wiped_at).getTime():0;return isNaN(t)?0:(d||0)};
  const a=t(old),b=t(e);
  if(!a)return b?e.wiped_at:null;
  if(!b)return old.wiped_at;
  return a<=b?old.wiped_at:e.wiped_at;
}
function mergeTwoLists(a,b){return mergeTwoListsRaw(a,b)}
function purgedLedgerEntry(slug,wiped_at){
  return {slug:String(slug||''),deleted:true,wiped_at:wiped_at||new Date().toISOString(),display_name:'',birthday:null,requester_name:'',requester_relation:'',requester_whatsapp:''};
}
function getWipedArchive(){
  const arc=lsGetArr(WIPED_ARCHIVE_KEY);
  const live=getFinishedPeople().map(p=>Object.assign({},p));
  const tombs=getPurgedList().map(t=>Object.assign({},t,{deleted:true,deleted_at:t.wiped_at}));
  return mergeTwoListsRaw(mergeTwoListsRaw(arc,live),tombs);
}
function archiveWipedEntry(entry){
  if(!entry||!entry.slug)return;
  const arc=lsGetArr(WIPED_ARCHIVE_KEY).filter(x=>String(x.slug||'').toLowerCase()!==String(entry.slug).toLowerCase());
  arc.unshift(entry);lsSetArr(WIPED_ARCHIVE_KEY,arc,500);
}
function mergeFinishedEntry(p){
  if(!p||!p.slug)return false;
  const s=String(p.slug).toLowerCase();
  if(p.deleted){ // route deletions to purged tombstones, drop live copy
    rememberPurged(Object.assign(purgedLedgerEntry(s,p.wiped_at),{display_name:p.display_name||''}));
    const list=lsGetArr(FINISHED_KEY).filter(x=>String(x.slug||'').toLowerCase()!==s);
    lsSetArr(FINISHED_KEY,list.filter(x=>!x.deleted),200);
    return true;
  }
  if(isPurged(s))return false; // R14: refuse to resurrect purged slug
  const list=lsGetArr(FINISHED_KEY);
  const idx=list.findIndex(x=>String(x.slug||'').toLowerCase()===s);
  let isNew=true;
  if(idx>=0){
    isNew=false;
    const old=list[idx];
    list[idx]=Object.assign({},old,p,{slug:old.slug||p.slug,wiped_at:earliestWiped(old,p)});
  }else{
    list.unshift(p);
  }
  list.sort((x,y)=>{const wx=x.wiped_at?new Date(x.wiped_at).getTime():0;const wy=y.wiped_at?new Date(y.wiped_at).getTime():0;return wy-wx});
  lsSetArr(FINISHED_KEY,list.filter(x=>!x.deleted),200);
  return isNew;
}
// Debounced fetch-merge-write to ALL three cloud stores (R16/R17)
let _pushFinTimer=null;
function pushFinishedLedger(){
  clearTimeout(_pushFinTimer);
  _pushFinTimer=setTimeout(doPushFinishedLedger,800);
}
async function doPushFinishedLedger(){
  try{
    const [jsonTxt,setTxt,tblTxt]=await Promise.all([sb.sbGetFinishedJson(),sb.sbGetFinishedFromSettings(),sb.sbGetFinishedFromTable()]);
    const parse=t=>{try{const o=JSON.parse(t);return Array.isArray(o)?o:(o&&Array.isArray(o.people)?o.people:[])}catch(e){return[]}};
    const remote=[...parse(jsonTxt),...parse(setTxt),...parse(tblTxt)];
    const local=lsGetArr(FINISHED_KEY);
    const tombs=getPurgedList();
    const merged=mergeTwoListsRaw(mergeTwoListsRaw(local,remote),tombs); // tombstones appended LAST → win
    const payload=JSON.stringify({updated_at:new Date().toISOString(),people:merged});
    lsSetArr(FINISHED_KEY,merged.filter(x=>!x.deleted),200);
    await Promise.all([sb.sbPutFinishedJson(payload),sb.sbPutFinishedToSettings(payload),sb.sbPutFinishedToTable(payload)]);
  }catch(e){console.warn('[finished-ledger] push failed:',e&&e.message)}
}
// Pull cloud → local (bootstrap seeds cloud from local on first run)
async function pullFinishedLedger(){
  try{
    const [jsonTxt,setTxt,tblTxt]=await Promise.all([sb.sbGetFinishedJson(),sb.sbGetFinishedFromSettings(),sb.sbGetFinishedFromTable()]);
    const parse=t=>{try{const o=JSON.parse(t);return Array.isArray(o)?o:(o&&Array.isArray(o.people)?o.people:[])}catch(e){return[]}};
    const remote=[...parse(tblTxt),...parse(setTxt),...parse(jsonTxt)];
    if(!remote.length){ // bootstrap: seed the cloud from local data
      const local=lsGetArr(FINISHED_KEY);
      if(local.length){await doPushFinishedLedger();return false}
      return false;
    }
    remote.sort((x,y)=>{const wx=x&&x.wiped_at?new Date(x.wiped_at).getTime():0;const wy=y&&y.wiped_at?new Date(y.wiped_at).getTime():0;return wx-wy}); // oldest first
    let changed=false;
    const before=JSON.stringify(lsGetArr(FINISHED_KEY))+JSON.stringify(getPurgedList());
    remote.forEach(p=>{if(p&&p.slug)mergeFinishedEntry(p)});
    changed=(JSON.stringify(lsGetArr(FINISHED_KEY))+JSON.stringify(getPurgedList()))!==before;
    return changed;
  }catch(e){return false}
}
// syncFinishedFromCloud: pull DUE people still present in `people` onto the ledger
async function syncFinishedFromCloud(){
  try{
    const nowMs=Date.now();
    const all=await sb.people()||[];
    const due=all.filter(p=>{
      if(!p.wipe_iso)return false;
      const d=new Date(p.wipe_iso);
      return !isNaN(d.getTime())&&d.getTime()<=nowMs;
    }).slice(0,200);
    let changed=false;
    due.forEach(p=>{
      if(isFinishedSlug(p.slug)||isPurged(p.slug))return;
      if(addFinishedPerson({slug:p.slug,display_name:p.display_name,birthday:p.birthday,
        requester_name:p.requester_name,requester_relation:p.requester_relation,requester_whatsapp:p.requester_whatsapp,
        finished_manually:false,wiped_at:p.wipe_iso}))changed=true;
    });
    return changed;
  }catch(e){return false}
}
function addFinishedPerson(person){
  if(!person||!person.slug)return false;
  const entry={
    id:person.id||null,
    slug:String(person.slug),
    display_name:person.display_name||'',
    birthday:person.birthday||null,
    requester_name:person.requester_name||'',
    requester_relation:person.requester_relation||'',
    requester_whatsapp:person.requester_whatsapp||'', // private — never rendered publicly (R6/R7)
    finished_manually:person.finished_manually!==false,
    wiped_at:person.wiped_at||new Date().toISOString()
  };
  const isNew=mergeFinishedEntry(entry);
  archiveWipedEntry(entry);
  if(isNew)pushFinishedLedger();
  return isNew;
}
async function removeFinishedPerson(slug){
  const s=String(slug||'').toLowerCase();
  if(!s)return;
  const existing=getFinishedPeople().find(x=>String(x.slug||'').toLowerCase()===s);
  const tomb=purgedLedgerEntry(s,(existing&&existing.wiped_at)||new Date().toISOString());
  if(existing)tomb.display_name=existing.display_name||'';
  rememberPurged(tomb);
  lsSetArr(FINISHED_KEY,lsGetArr(FINISHED_KEY).filter(x=>String(x.slug||'').toLowerCase()!==s&&!x.deleted),200);
  // fetch-merge-write ALL three cloud copies with the tombstone appended last (R13)
  try{
    const [jsonTxt,setTxt,tblTxt]=await Promise.all([sb.sbGetFinishedJson(),sb.sbGetFinishedFromSettings(),sb.sbGetFinishedFromTable()]);
    const parse=t=>{try{const o=JSON.parse(t);return Array.isArray(o)?o:(o&&Array.isArray(o.people)?o.people:[])}catch(e){return[]}};
    const merged=mergeTwoListsRaw(mergeTwoListsRaw([...parse(tblTxt),...parse(setTxt),...parse(jsonTxt),...lsGetArr(FINISHED_KEY)],[tomb]),[tomb]);
    const payload=JSON.stringify({updated_at:new Date().toISOString(),people:merged});
    await Promise.all([sb.sbPutFinishedJson(payload),sb.sbPutFinishedToSettings(payload),sb.sbPutFinishedToTable(payload)]);
  }catch(e){console.warn('[finished-ledger] remove push failed:',e&&e.message)}
}
async function removeFinishedPeople(slugs){
  for(const s of (slugs||[]))await removeFinishedPerson(s);
}
function restoreFromWipedArchive(slug){
  const s=String(slug||'').toLowerCase();
  const rec=getWipedArchive().find(x=>String(x.slug||'').toLowerCase()===s);
  if(!rec)return false;
  forgetPurged(s); // lift the tombstone first (R14)
  mergeFinishedEntry(Object.assign({},rec,{deleted:false}));
  pushFinishedLedger();
  return true;
}

// ===== Home screen 💐 Finished section (§4) =====
let FINISHED_COLLAPSED=true; // section starts collapsed (R23)
window.homeVisiblePeople=function(){
  const nowMs=Date.now();
  return (S.PEOPLE||[]).filter(p=>{
    if(p.enabled===false)return false;                       // rule 1
    if(isFinishedSlug(p.slug))return false;                  // rule 2 (R3)
    if(p.wipe_iso){const d=new Date(p.wipe_iso);if(!isNaN(d.getTime())&&d.getTime()<=nowMs)return false;} // rule 3
    return true;
  });
};
// Returns live-table people whose wipe date passed AND who are already on the ledger.
// Deliberately does NOT auto-publish due-but-unmoved people (HD1.1 / R1).
function finishedFromPeopleTable(){
  const nowMs=Date.now();
  return (S.PEOPLE||[]).filter(p=>{
    if(!p.wipe_iso)return false;
    const d=new Date(p.wipe_iso);
    return !isNaN(d.getTime())&&d.getTime()<=nowMs&&isFinishedSlug(p.slug);
  }).map(p=>({slug:p.slug,display_name:p.display_name,birthday:p.birthday,wiped_at:p.wipe_iso,finished_manually:true}));
}
window.renderFinishedSection=function(){
  const wrap=$('homeFinished'),headEl=$('homeFinishedHead'),cnt=$('homeFinishedCount'),listEl=$('homeFinishedList');
  if(!wrap||!listEl)return;
  let finished=getFinishedPeople();
  finished=mergeTwoListsRaw(finished,finishedFromPeopleTable()).filter(p=>!p.deleted);
  if(!finished.length){wrap.style.display='none';wrap.classList.add('collapsed');return}
  wrap.style.display='';
  if(cnt)cnt.textContent=finished.length;
  const escAttr=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  listEl.innerHTML='';
  finished.forEach(p=>{
    const name=String(p.display_name||p.slug||'Person');
    let bdayLine='';
    const d=daysUntilBirthday(p.birthday);
    if(d!==null){
      if(d===0)bdayLine='🎂 Birthday today!';
      else if(d===1)bdayLine='🎂 Birthday tomorrow';
      else bdayLine='🎂 in '+d+' days';
      bdayLine+=' · '+formatBirthdayDate(p.birthday);
    }else if(p.birthday){bdayLine='🎂 '+formatBirthdayDate(p.birthday)}
    const b=document.createElement('button');b.type='button';b.className='home-btn finished-btn';
    b.dataset.slug=escAttr(p.slug);b.dataset.name=name.toLowerCase();
    b.innerHTML='<span class="home-btn-emoji">💐</span><span>'+name.replace(/</g,'&lt;')+'</span>'
      +(bdayLine?'<span class="home-btn-bday finished-date">'+bdayLine+'</span>':'');
    listEl.appendChild(b);
  });
  // Header collapse toggle — bound exactly once
  if(headEl&&headEl.dataset._bound!=='1'){
    headEl.dataset._bound='1';
    headEl.onclick=()=>{FINISHED_COLLAPSED=!FINISHED_COLLAPSED;wrap.classList.toggle('collapsed',FINISHED_COLLAPSED)};
  }
  wrap.classList.toggle('collapsed',FINISHED_COLLAPSED);
  // Tile clicks: admin = remove (with confirm), visitor = thank-you toast (R9/R24)
  listEl.querySelectorAll('.finished-btn').forEach(b=>{
    b.onclick=async()=>{
      const slug=b.dataset.slug;
      if(S.ADMIN_MODE===true){
        if(!confirm('💐 Remove “'+(b.dataset.name||slug)+'” from the finished list?\n\nThey stay safe in the private 🗑️ Wiped Out archive and can be restored anytime.'))return;
        await removeFinishedPerson(slug);
        renderFinishedSection();
        if(window.loadAdminFinished)loadAdminFinished();
        if(window.updateFinishedBadge)updateFinishedBadge();
        __showToast('🗑️ Removed from home screen (cloud-synced)');
      }else{
        __showToast('💐 This surprise has been completed and archived. Thank you for being part of it 💕');
      }
    };
  });
};

// ===== Admin: Move to Finished (§6.2) =====
async function moveCompletedGuestsToFinished(ids){
  ids=(ids||[]).filter(Boolean);
  if(!ids.length){__showToast('⚠️ Tick at least one completed submission first.',false);return}
  if(!confirm('💐 Move '+ids.length+' to Finished?\n\nTheir card data will be wiped and they will appear on the home screen 💐 Finished section for every visitor.'))return;
  __showToast('⏳ Moving to Finished…');
  const rows=await sb.guests()||[];
  let ok=0,fail=0;
  for(const id of ids){
    try{
      const r=rows.find(x=>x.id===id);if(!r){fail++;continue}
      const pl=r.payload||{};const prop=pl.person_proposal||{};const gi=pl.guest_info||{};
      const slug=String(r.approved_login_id||prop.slug||r.target_person_slug||'');
      if(!slug){fail++;continue}
      const person=(S.PEOPLE||[]).find(p=>p.id===r.approved_person_id)||(S.PEOPLE||[]).find(p=>String(p.slug||'').toLowerCase()===slug.toLowerCase());
      addFinishedPerson({
        id:r.id,slug,
        display_name:prop.display_name||(person&&person.display_name)||'',
        birthday:(person&&person.birthday)||prop.birthday||null,
        requester_name:gi.name||r.guest_name||'',
        requester_relation:gi.relation||'',
        requester_whatsapp:gi.whatsapp||r.guest_whatsapp||'', // kept PRIVATE
        finished_manually:true,
        wiped_at:(person&&person.wipe_iso)||new Date().toISOString() // scheduled "said" date/time (R4)
      });
      if(person)await wipeOnePerson(person.id); // wipe card data without re-adding a duplicate ledger entry
      await sb.updGuest(r.id,{status:'finished'}); // R11
      ok++;
    }catch(e){fail++;console.warn('[finished] move failed for #'+id,e&&e.message)}
  }
  try{S.PEOPLE=await sb.people()||[];}catch(e){}
  if(window.buildHome)buildHome();
  loadGuestHistory();
  if(window.loadAdminFinished)loadAdminFinished();
  if(window.updateFinishedBadge)updateFinishedBadge();
  __showToast('💐 '+ok+' moved to Finished'+(fail?' · '+fail+' failed':''),fail&&!ok?false:undefined);
}

// ===== Admin: Delete Completed rows from database (§6.3) =====
async function deleteCompletedGuestsFromDb(ids){
  ids=(ids||[]).filter(Boolean);
  if(!ids.length){__showToast('⚠️ Tick at least one completed submission first.',false);return}
  if(!confirm('🗑️ Permanently delete '+ids.length+' submission record(s) from the database?\n\nThis cannot be undone.'))return;
  __showToast('⏳ Deleting…');
  let ok=0,fail=0;
  for(const id of ids){
    try{await sb.delGuest(id);ok++}catch(e){fail++}
  }
  loadGuestHistory();
  if(window.loadAdminFinished)loadAdminFinished();
  if(window.updateFinishedBadge)updateFinishedBadge();
  __showToast('🗑️ '+ok+' deleted'+(fail?' · '+fail+' failed':''),fail&&!ok?false:undefined);
}

// ===== Admin: 💐 Finished tab renderer (§6.5) =====
async function loadAdminFinished(){
  const list=$('adminFinishedList');if(!list)return;
  list.textContent='Loading…';
  try{ await pullFinishedLedger(); }catch(e){}
  const localList=getFinishedPeople();
  const rows=(await sb.guests())||[];
  const finishedRows=rows.filter(r=>r.status==='finished');
  // bySlug index from finished + approved rows
  const bySlug={};
  rows.filter(r=>r.status==='finished'||r.status==='approved').forEach(r=>{
    const pl=r.payload||{};const prop=pl.person_proposal||{};
    const keys=[r.approved_login_id,prop.slug,r.target_person_slug];
    keys.forEach(k=>{if(k)bySlug[String(k).toLowerCase()]=bySlug[String(k).toLowerCase()]||r});
  });
  const mapped=finishedRows.map(r=>{
    const pl=r.payload||{};const prop=pl.person_proposal||{};const gi=pl.guest_info||{};
    const slug=String(r.approved_login_id||prop.slug||r.target_person_slug||'');
    return {id:r.id,slug,display_name:prop.display_name||r.target_person_slug||slug,birthday:prop.birthday||null,
      requester_name:gi.name||r.guest_name||'',requester_relation:gi.relation||'',requester_whatsapp:gi.whatsapp||r.guest_whatsapp||'',
      finished_manually:true,wiped_at:r.finished_at||r.updated_at||r.created_at||new Date().toISOString(),_rowId:r.id};
  });
  const ledger=mergeTwoListsRaw(localList,mapped).filter(p=>!p.deleted);
  if(window.updateFinishedBadge)updateFinishedBadge();
  if(!ledger.length){
    list.innerHTML='<div class="empty-state" style="padding:1.2rem;text-align:center;color:var(--c-text-muted);"><div style="font-size:2rem;">💐</div>No finished people yet — move someone here from the ✅ Completed tab.</div>';
    updateFinSelBar();return;
  }
  const esc=s=>String(s==null?'':s).replace(/</g,'&lt;');
  list.innerHTML='';
  ledger.forEach(p=>{
    const s=String(p.slug||'').toLowerCase();
    const linked=bySlug[s]&&bySlug[s].status==='finished'?bySlug[s]:null;
    const wa=String(p.requester_whatsapp||'').replace(/[^0-9+]/g,'');
    const waLink=wa?('https://wa.me/'+wa.replace(/[^0-9]/g,'')):'';
    const wipedStr=p.wiped_at?(new Date(p.wiped_at).toLocaleString()):'';
    const el=document.createElement('div');el.className='repeat-row guest-row';
    el.style.background='linear-gradient(135deg,#faf4fd,#f3e8fa)';
    el.innerHTML=`<label style="position:absolute;top:.55rem;left:.55rem;z-index:2;"><input type="checkbox" class="guest-check finished-check" data-slug="${esc(p.slug)}" onclick="event.stopPropagation()"></label>
    <div style="font-size:.85rem;line-height:1.6;padding-left:1.4rem;">
      <strong style="color:#8e44ad;">💐 ${esc(p.display_name||p.slug)}</strong>${p.finished_manually===false?' <span class="person-id-pill" style="background:#eee9f6;color:#8e44ad;border-color:#8e44ad;">🕊️ auto-wiped</span>':''}
      <div><strong>🔑 Login ID:</strong> <code style="background:#fff;padding:.15rem .45rem;border-radius:.35rem;font-family:monospace;">${esc(p.slug)}</code></div>
      ${p.birthday?'<div>🎂 Birthday: '+esc(String(p.birthday).slice(0,10))+'</div>':''}
      ${wipedStr?'<div>🗓️ Wiped out / finished: '+esc(wipedStr)+'</div>':''}
      ${(p.requester_name||wa)?'<hr style="border:none;border-top:1px dashed rgba(142,68,173,.3);margin:.4rem 0;">':''}
      ${p.requester_name?'<strong>👤 Requester:</strong> '+esc(p.requester_name)+(p.requester_relation?' ('+esc(p.requester_relation)+')':'')+'<br>':''}
      ${wa?'📱 '+esc(wa)+' '+(waLink?'<a href="'+waLink+'" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#25D366;color:#fff;padding:.15rem .55rem;border-radius:40px;font-size:.75rem;text-decoration:none;font-weight:800;">💬 Chat</a>':'')+'<br>':''}
    </div>
    <div style="margin-top:.5rem;display:flex;gap:.4rem;flex-wrap:wrap;">
      ${linked?'<button type="button" class="repeat-add fin-undo-btn" data-id="'+linked.id+'" style="background:#0a7a3d;">↩️ Undo — move back to Completed</button>':''}
      <button type="button" class="repeat-add fin-del-btn" data-slug="${esc(p.slug)}" style="background:#c0392b;">🗑️ Remove from home screen</button>
    </div>`;
    list.appendChild(el);
  });
  list.querySelectorAll('.fin-undo-btn').forEach(b=>{
    b.onclick=async()=>{
      try{
        await sb.updGuest(parseInt(b.dataset.id),{status:'approved'}); // R12
        __showToast('↩️ Moved back to ✅ Completed');
        loadAdminFinished();loadGuestHistory();
        if(window.updateFinishedBadge)updateFinishedBadge();
      }catch(e){__showToast('❌ '+e.message,false)}
    };
  });
  list.querySelectorAll('.fin-del-btn').forEach(b=>{
    b.onclick=async()=>{
      if(!confirm('🗑️ Remove this person from the home screen for ALL visitors?\n\nA privacy-stripped tombstone syncs everywhere; they stay safe in the private archive.'))return;
      await removeFinishedPerson(b.dataset.slug);
      loadAdminFinished();
      if(window.renderFinishedSection)renderFinishedSection();
      if(window.updateFinishedBadge)updateFinishedBadge();
      __showToast('🗑️ Removed from home screen');
    };
  });
  const boxes=()=>Array.from(list.querySelectorAll('.finished-check'));
  boxes().forEach(cb=>{cb.onchange=updateFinSelBar});
  const rm=$('removeSelectedFromFinished');
  if(rm&&rm.dataset._bound!=='1'){
    rm.dataset._bound='1';
    rm.onclick=removeSelectedFinishedPeople;
  }
  updateFinSelBar();
}
async function removeSelectedFinishedPeople(){
  const list=$('adminFinishedList');if(!list)return;
  const slugs=Array.from(list.querySelectorAll('.finished-check:checked')).map(x=>x.dataset.slug);
  if(!slugs.length){__showToast('⚠️ Tick at least one finished person first.',false);return}
  if(!confirm('🗑️ Remove '+slugs.length+' from the home screen for every visitor?'))return;
  await removeFinishedPeople(slugs);
  loadAdminFinished();
  if(window.renderFinishedSection)renderFinishedSection();
  if(window.updateFinishedBadge)updateFinishedBadge();
  __showToast('🗑️ '+slugs.length+' removed from home screen');
}
window.loadAdminFinished=loadAdminFinished;
window.moveCompletedGuestsToFinished=moveCompletedGuestsToFinished;
window.updateFinishedBadge=function(){
  const badge=$('finishedBadge');if(!badge)return;
  const n=getFinishedPeople().length; // R20
  badge.textContent=n;
  badge.style.display=n?'inline-block':'none';
};
window.bindGuestStatusTabs=function(){
  const tabsEl=$('guestStatusTabs');if(!tabsEl||tabsEl.dataset._bound==='1')return;
  const sections={pending:'guestPendingSection',approved:'guestCompletedSection',finished:'guestFinishedSection',rejected:'guestRejectedSection'};
  const loaders={pending:loadGuestApprovals,approved:loadGuestHistory,finished:loadAdminFinished,rejected:loadRejectedGuests};
  tabsEl.querySelectorAll('.panel-tab').forEach(tab=>{
    if(tab.dataset._bound==='1')return;
    tab.dataset._bound='1';
    tab.onclick=()=>{
      tabsEl.querySelectorAll('.panel-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const st=tab.dataset.guestStatus;
      Object.keys(sections).forEach(k=>{const el=$(sections[k]);if(el)el.style.display=(k===st)?'':'none'});
      const ld=loaders[st];if(ld)ld();
      if(st==='finished'&&window.updateFinishedBadge)updateFinishedBadge();
    };
  });
};
async function loadRejectedGuests(){
  const list=$('guestRejectedList');if(!list)return;
  list.textContent='Loading…';
  const rows=(await sb.guests())||[];
  const rejected=rows.filter(r=>r.status==='rejected');
  if(!rejected.length){list.innerHTML='<div style="padding:.6rem;color:var(--c-text-muted);">No rejected submissions.</div>';return}
  const esc=s=>String(s==null?'':s).replace(/</g,'&lt;');
  list.innerHTML='';
  rejected.forEach(r=>{
    const pl=r.payload||{};const prop=pl.person_proposal||{};const gi=pl.guest_info||{};
    const el=document.createElement('div');el.className='repeat-row guest-row';
    el.style.background='linear-gradient(135deg,#fdf4f4,#fbeaea)';
    el.innerHTML=`<div style="font-size:.85rem;line-height:1.6;">
      <strong>🗑️ ${esc(prop.display_name||r.target_person_slug)}</strong>
      <em style="color:var(--c-text-muted);"> (login id: ${esc(prop.slug||r.target_person_slug||'')})</em>
      ${gi.name?'<div>👤 Requester: '+esc(gi.name)+'</div>':''}
      ${r.created_at?'<div style="font-size:.75rem;color:var(--c-text-muted);font-style:italic;">Submitted: '+esc(new Date(r.created_at).toLocaleString())+'</div>':''}
    </div>`;
    list.appendChild(el);
  });
}
window.loadRejectedGuests=loadRejectedGuests;
if($('refreshAdminFinished'))$('refreshAdminFinished').onclick=loadAdminFinished;
if($('refreshRejectedGuests'))$('refreshRejectedGuests').onclick=loadRejectedGuests;

const G={gifts:[],story:[],events:[],voice:[],video:[],pins:[],media:[],privateMedia:[],theme:'',counters:{}};

document.querySelectorAll('#guestLangTabs button').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('#guestLangTabs button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    saveGuestTextsFromFields(S.GUEST_EDIT_LANG);
    S.GUEST_EDIT_LANG=btn.dataset.guestLang;
    applyGuestTextsToFields(S.GUEST_EDIT_LANG);
  };
});
function applyGuestTextsToFields(lang){ const src=(S.GUEST_TEXTS&&S.GUEST_TEXTS[lang])||{}; document.querySelectorAll('.g-text').forEach(el=>{const k=el.dataset.gt;if(!k)return; el.value=src[k]!==undefined?src[k]:'';}); }
function saveGuestTextsFromFields(lang){ const dst=(S.GUEST_TEXTS=S.GUEST_TEXTS||{en:{},gu:{},hi:{}}); dst[lang]=dst[lang]||{}; document.querySelectorAll('.g-text').forEach(el=>{const k=el.dataset.gt;if(!k)return; dst[lang][k]=el.value;}); }

function renderGuestCounters(){
  COUNTERS.forEach((c,idx)=>{ const num=idx+1; const showEl=$('g_ct'+num+'_show');if(showEl)showEl.checked=(String(G.counters[c.showKey])!=='false'); });
  document.querySelectorAll('.g-ctr-tz').forEach(el=>{ const key=el.dataset.gc;if(!key)return; fillTzSelect(el,G.counters[key]||DEFAULT_TZ); el.value=G.counters[key]||DEFAULT_TZ; });
  document.querySelectorAll('.g-ctr').forEach(el=>{
    const key=el.dataset.gc;if(!key)return;
    if(key.endsWith('_datetime')){ const tzKey=key+'_tz'; const tz=G.counters[tzKey]||DEFAULT_TZ; el.value=G.counters[key]?utcToZonedLocal(G.counters[key],tz):''; }
    else { el.value=G.counters[key]!==undefined?G.counters[key]:''; }
  });
}
document.querySelectorAll('.g-ctr').forEach(el=>{
  const handler=()=>{
    const k=el.dataset.gc;if(!k)return;
    if(k.endsWith('_datetime')){ const tzKey=k+'_tz'; const tzSel=document.querySelector('.g-ctr-tz[data-gc="'+tzKey+'"]'); const tz=tzSel?tzSel.value:DEFAULT_TZ; G.counters[k]=el.value?zonedToUTC(el.value,tz):''; }
    else { G.counters[k]=el.value; }
  };
  el.addEventListener('input',handler); el.addEventListener('change',handler);
});
document.querySelectorAll('.g-ctr-tz').forEach(el=>{
  el.addEventListener('change',()=>{
    const tzKey=el.dataset.gc;if(!tzKey)return;
    G.counters[tzKey]=el.value;
    const dtKey=tzKey.replace(/_tz$/,'');
    const dtEl=document.querySelector('.g-ctr[data-gc="'+dtKey+'"]');
    if(dtEl&&dtEl.value)G.counters[dtKey]=zonedToUTC(dtEl.value,el.value);
  });
});
[1,2,3].forEach(n=>{ const el=$('g_ct'+n+'_show'); if(el)el.onchange=()=>{G.counters['ct'+n+'_show']=el.checked?'true':'false'}; });

window.openGuestPanel=function(){
  S.GUEST_TEXTS={en:{},gu:{},hi:{}};S.GUEST_EDIT_LANG='en';
  document.querySelectorAll('#guestLangTabs button').forEach(b=>b.classList.toggle('active',b.dataset.guestLang==='en'));
  applyGuestTextsToFields('en');
  ['guestName','guestWhatsapp','newPersonName','newPersonSlug','newPersonBirthday','guestNote'].forEach(id=>{const el=$(id);if(el)el.value=''});
  const gmid=$('g_mediaIds');if(gmid)gmid.value='';
  const gpid=$('g_privateIds');if(gpid)gpid.value='';
  const rel=$('guestRelation');if(rel)rel.value='';
  const occ=$('guestOccasion');if(occ)occ.value='';
  G.gifts=[];G.story=[];G.events=[];G.voice=[];G.video=[];G.pins=[];G.media=[];G.privateMedia=[];G.theme='';G.counters={};
  document.querySelectorAll('#guestPanel .tz-select').forEach(el=>fillTzSelect(el,DEFAULT_TZ));
  renderGuestTheme();renderGuestGifts();renderGuestStory();renderGuestEvents();
  renderGuestVoice();renderGuestVideo();renderGuestPins();renderGuestMedia();renderGuestPrivate();
  renderGuestCounters();
  const gs=$('guestStatus');if(gs){gs.textContent='';gs.className='panel-status'}
  const ges=$('guestExcelStatus');if(ges){ges.textContent='';ges.className='panel-status'}
  show($('guestPanel'));
};
$('guestPanelClose').onclick=()=>hide($('guestPanel'));
$('guestCancel').onclick=()=>hide($('guestPanel'));

function renderGuestTheme(){document.querySelectorAll('#guestThemeGrid .theme-swatch').forEach(el=>el.classList.toggle('selected',el.dataset.gthemePick===G.theme))}
document.querySelectorAll('#guestThemeGrid .theme-swatch').forEach(el=>{el.onclick=()=>{G.theme=el.dataset.gthemePick;renderGuestTheme()}});

function renderGuestGifts(){ const w=$('guestGiftsRepeater');if(!w)return;w.innerHTML=''; G.gifts.forEach((g,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Emoji</label><input type="text" class="panel-input" data-gf="emoji" data-i="${i}" value="${(g.emoji||'🎁')}"></div><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gf="title" data-i="${i}" value="${(g.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Message</label><textarea class="panel-textarea" data-gf="message" data-i="${i}">${(g.message||'')}</textarea></div><div class="panel-field"><label class="panel-label">Photo Drive ID (comma-separate for slideshow)</label><input type="text" class="panel-input" data-gf="photo_drive_id" data-i="${i}" value="${(g.photo_drive_id||'')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input,textarea').forEach(el=>{el.oninput=()=>{G.gifts[+el.dataset.i][el.dataset.gf]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{G.gifts.splice(+b.dataset.i,1);renderGuestGifts()}}); }
$('guestAddGiftRow').onclick=()=>{G.gifts.push({emoji:'🎁',title:'',message:'',photo_drive_id:''});renderGuestGifts()};
function renderGuestStory(){ const w=$('guestStoryRepeater');if(!w)return;w.innerHTML=''; G.story.forEach((s,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gs="title" data-i="${i}" value="${(s.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Body</label><textarea class="panel-textarea" data-gs="body" data-i="${i}">${(s.body||'')}</textarea></div><div class="panel-field"><label class="panel-label">Photo Drive ID (comma-separate for slideshow)</label><input type="text" class="panel-input" data-gs="photo_drive_id" data-i="${i}" value="${(s.photo_drive_id||'')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input,textarea').forEach(el=>{el.oninput=()=>{G.story[+el.dataset.i][el.dataset.gs]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{G.story.splice(+b.dataset.i,1);renderGuestStory()}}); }
$('guestAddStoryRow').onclick=()=>{G.story.push({title:'',body:'',photo_drive_id:''});renderGuestStory()};
function renderGuestEvents(){ const w=$('guestEventsRepeater');if(!w)return;w.innerHTML=''; G.events.forEach((ev,i)=>{const row=document.createElement('div');row.className='repeat-row';
  const tz=ev.target_iso_tz||DEFAULT_TZ; const local=ev.target_iso?utcToZonedLocal(ev.target_iso,tz):'';
  const tzOptsHtml=TZ_OPTIONS.map(o=>`<option value="${o.v}"${o.v===tz?' selected':''}>${o.l}</option>`).join('');
  row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Icon</label><input type="text" class="panel-input" data-ge="icon" data-i="${i}" value="${(ev.icon||'📅')}"></div><div class="panel-field"><label class="panel-label">Label</label><input type="text" class="panel-input" data-ge="label" data-i="${i}" value="${(ev.label||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Target date &amp; time + timezone</label><div class="tz-row"><input type="datetime-local" class="panel-input" data-ge="target_local" data-i="${i}" value="${local}"><select class="panel-select tz-select" data-ge="target_tz" data-i="${i}">${tzOptsHtml}</select></div></div>`; w.appendChild(row)});
  w.querySelectorAll('input,select').forEach(el=>{
    el.oninput=el.onchange=()=>{
      const i=+el.dataset.i;
      if(el.dataset.ge==='target_local'){ const tzEl=w.querySelector('.tz-select[data-ge="target_tz"][data-i="'+i+'"]'); const tz=tzEl?tzEl.value:DEFAULT_TZ; G.events[i].target_iso=el.value?zonedToUTC(el.value,tz):''; G.events[i].target_iso_tz=tz; }
      else if(el.dataset.ge==='target_tz'){ const dtEl=w.querySelector('input[data-ge="target_local"][data-i="'+i+'"]'); const tz=el.value; G.events[i].target_iso_tz=tz; if(dtEl&&dtEl.value)G.events[i].target_iso=zonedToUTC(dtEl.value,tz); }
      else if(el.dataset.ge){ G.events[i][el.dataset.ge]=el.value; }
    };
  });
  w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{G.events.splice(+b.dataset.i,1);renderGuestEvents()}}); }
$('guestAddEventRow').onclick=()=>{G.events.push({icon:'📅',label:'',target_iso:'',target_iso_tz:DEFAULT_TZ});renderGuestEvents()};
function renderGuestVoice(){ const w=$('guestVoiceRepeater');if(!w)return;w.innerHTML=''; G.voice.forEach((v,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gv="title" data-i="${i}" value="${(v.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Audio URL</label><input type="text" class="panel-input" data-gv="audio_url" data-i="${i}" value="${(v.audio_url||'')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input').forEach(el=>{el.oninput=()=>{G.voice[+el.dataset.i][el.dataset.gv]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{G.voice.splice(+b.dataset.i,1);renderGuestVoice()}}); }
$('guestAddVoiceRow').onclick=()=>{G.voice.push({title:'',audio_url:''});renderGuestVoice()};
function renderGuestVideo(){ const w=$('guestVideoRepeater');if(!w)return;w.innerHTML=''; G.video.forEach((v,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gd="title" data-i="${i}" value="${(v.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Video URL</label><input type="text" class="panel-input" data-gd="video_url" data-i="${i}" value="${(v.video_url||'')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input').forEach(el=>{el.oninput=()=>{G.video[+el.dataset.i][el.dataset.gd]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{G.video.splice(+b.dataset.i,1);renderGuestVideo()}}); }
$('guestAddVideoRow').onclick=()=>{G.video.push({title:'',video_url:''});renderGuestVideo()};
function renderGuestPins(){ const w=$('guestPinsRepeater');if(!w)return;w.innerHTML=''; G.pins.forEach((p,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Label</label><input type="text" class="panel-input" data-gp="label" data-i="${i}" value="${(p.label||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Lat</label><input type="text" class="panel-input" data-gp="lat" data-i="${i}" value="${p.lat||''}"></div><div class="panel-field"><label class="panel-label">Lng</label><input type="text" class="panel-input" data-gp="lng" data-i="${i}" value="${p.lng||''}"></div><div class="panel-field"><label class="panel-label">Photo IDs (comma-separate for slideshow)</label><input type="text" class="panel-input" data-gp="photo_drive_id" data-i="${i}" value="${(p.photo_drive_id||'')}"></div><div class="panel-field"><label class="panel-label">Story</label><textarea class="panel-textarea" data-gp="story" data-i="${i}">${(p.story||'')}</textarea></div>`; w.appendChild(row)}); w.querySelectorAll('input,textarea').forEach(el=>{el.oninput=()=>{G.pins[+el.dataset.i][el.dataset.gp]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{G.pins.splice(+b.dataset.i,1);renderGuestPins()}}); }
$('guestAddPinRow').onclick=()=>{G.pins.push({label:'',lat:'',lng:'',photo_drive_id:'',story:''});renderGuestPins()};
function renderGuestMedia(){ const w=$('guestMediaRepeater');if(!w)return;w.innerHTML=''; (G.media||[]).forEach((m,i)=>{ const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Type</label><select class="panel-select" data-gm="type" data-i="${i}"><option value="photo"${m.type==='photo'?' selected':''}>Photo</option><option value="video"${m.type==='video'?' selected':''}>Video</option></select></div><div class="panel-field"><label class="panel-label">Drive ID</label><input type="text" class="panel-input" data-gm="drive_id" data-i="${i}" value="${(m.drive_id||'')}"></div><div class="panel-field"><label class="panel-label">Direct URL</label><input type="text" class="panel-input" data-gm="src" data-i="${i}" value="${(m.src||'')}"></div><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gm="title" data-i="${i}" value="${(m.title||'').replace(/"/g,'&quot;')}"></div>`; w.appendChild(row); }); w.querySelectorAll('input,select').forEach(el=>{el.onchange=el.oninput=()=>{G.media[+el.dataset.i][el.dataset.gm]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{G.media.splice(+b.dataset.i,1);renderGuestMedia()}}); }
$('guestAddMediaRow').onclick=()=>{G.media=G.media||[];G.media.push({type:'photo',drive_id:'',src:'',title:''});renderGuestMedia()};
$('guestBulkAddMedia').onclick=()=>{
  const v=$('g_mediaIds').value||'';const pb=parseBulkMedia(v);
  if(!pb.total){__showToast('Paste at least one Drive ID or direct link',false);return}
  G.media=G.media||[];const before=G.media.length;
  pb.vids.forEach(m=>G.media.push(m));
  pb.photos.forEach(m=>G.media.push(m));
  G.media=dedupeMedia(G.media);const removed=(before+pb.total)-G.media.length;
  renderGuestMedia();$('g_mediaIds').value='';
  __showToast('✅ Added '+pb.vids.length+' video(s) · '+pb.photos.length+' photo(s)'+(removed>0?(' · '+removed+' duplicate(s) removed'):''));
};
document.querySelectorAll('#guestPanel .panel-tab').forEach(tab=>{
  tab.onclick=()=>{
    document.querySelectorAll('#guestPanel .panel-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('#guestPanel .panel-pane').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    const p=$(tab.dataset.pane);if(p)p.classList.add('active');
  };
});

$('guestExportBtn').onclick=()=>{
  const st=$('guestExcelStatus');
  try{
    if(!window.XLSX)throw new Error('XLSX library not loaded.');
    saveGuestTextsFromFields(S.GUEST_EDIT_LANG);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{sheet:'How-to',instruction:'Fill all sheets, then Import + Submit.'}]),'How-to');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{display_name:$('newPersonName').value||'',slug:$('newPersonSlug').value||'',birthday:$('newPersonBirthday').value||''}]),'people');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{name:$('guestName').value||'',whatsapp:$('guestWhatsapp').value||'',relation:$('guestRelation').value||'',occasion:$('guestOccasion').value||'',note:$('guestNote').value||''}]),'requester');
    const en=S.GUEST_TEXTS.en||{},gu=S.GUEST_TEXTS.gu||{},hi=S.GUEST_TEXTS.hi||{};
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(TEXT_FIELDS.map(k=>({key:k,en_value:en[k]||'',gu_value:gu[k]||'',hi_value:hi[k]||''}))),'texts');
    const c=G.counters||{};
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([
      {key:'theme',value:G.theme||'romantic'},{key:'defaultLang',value:'en'},
      {key:'photoDurationSec',value:'5'},{key:'shuffleMusicOn',value:'false'},{key:'shuffleMediaOn',value:'false'},
      {key:'slideEffectsEnabled',value:'true'},{key:'effectsIntensity',value:'1'},
      {key:'floatersEnabled',value:'true'},{key:'floaterDensity',value:'1'},
      {key:'ct1_show',value:c.ct1_show||'true'},{key:'ct1_label',value:c.ct1_label||''},{key:'ct1_datetime',value:c.ct1_datetime||''},{key:'ct1_datetime_tz',value:c.ct1_datetime_tz||DEFAULT_TZ},{key:'ct1_dispdate',value:c.ct1_dispdate||''},
      {key:'ct2_show',value:c.ct2_show||'true'},{key:'ct2_label',value:c.ct2_label||''},{key:'ct2_datetime',value:c.ct2_datetime||''},{key:'ct2_datetime_tz',value:c.ct2_datetime_tz||DEFAULT_TZ},{key:'ct2_dispdate',value:c.ct2_dispdate||''},
      {key:'ct3_show',value:c.ct3_show||'true'},{key:'ct3_label',value:c.ct3_label||''},{key:'ct3_datetime',value:c.ct3_datetime||''},{key:'ct3_datetime_tz',value:c.ct3_datetime_tz||DEFAULT_TZ},{key:'ct3_dispdate',value:c.ct3_dispdate||''}
    ]),'shared');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((G.gifts.length?G.gifts:[{emoji:'',title:'',message:'',photo_drive_id:''}]).map(g=>({emoji:g.emoji||'',title:g.title||'',message:g.message||'',photo_drive_id:g.photo_drive_id||''}))),'gifts');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((G.events.length?G.events:[{icon:'',label:'',target_iso:''}]).map(e=>({icon:e.icon||'',label:e.label||'',target_iso:e.target_iso||''}))),'events');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((G.voice.length?G.voice:[{title:'',audio_url:''}]).map(v=>({title:v.title||'',audio_url:v.audio_url||''}))),'voice');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((G.video.length?G.video:[{title:'',video_url:''}]).map(v=>({title:v.title||'',video_url:v.video_url||''}))),'video');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((G.pins.length?G.pins:[{label:'',lat:'',lng:''}]).map(p=>({label:p.label||'',lat:p.lat||'',lng:p.lng||''}))),'pins');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((G.story.length?G.story:[{title:'',body:''}]).map(s=>({title:s.title||'',body:s.body||''}))),'story');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((G.media&&G.media.length?G.media:[{type:'photo',drive_id:''}]).map(m=>({type:m.type||'photo',src:m.src||'',drive_id:m.drive_id||'',title:m.title||''}))),'media');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((G.privateMedia&&G.privateMedia.length?G.privateMedia:[{type:'photo',drive_id:''}]).map(m=>({type:m.type||'photo',src:m.src||'',drive_id:m.drive_id||'',title:m.title||''}))),'private_media');
    const slug=$('newPersonSlug').value.trim().toLowerCase()||'guest';
    XLSX.writeFile(wb,'guest-template-'+slug+'.xlsx');
    st.textContent='✅ Template downloaded.';st.className='panel-status ok';
  }catch(e){console.error(e);st.textContent='❌ '+(e.message||'Download failed');st.className='panel-status err'}
};
$('guestImportBtn').onclick=()=>$('guestExcelInput').click();
$('guestExcelInput').onchange=async(e)=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  const st=$('guestExcelStatus');st.textContent='⏳ Reading…';st.className='panel-status';
  try{
    if(!window.XLSX)throw new Error('XLSX library not loaded');
    const buf=await f.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const readSheet=name=>wb.Sheets[name]?XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:''}):[];
    const ppl=readSheet('people');
    if(ppl[0]){ if(ppl[0].display_name!==undefined)$('newPersonName').value=String(ppl[0].display_name||''); if(ppl[0].slug!==undefined)$('newPersonSlug').value=String(ppl[0].slug||''); if(ppl[0].birthday!==undefined)$('newPersonBirthday').value=String(ppl[0].birthday||'').slice(0,10); }
    const rq=readSheet('requester');
    if(rq[0]){ if(rq[0].name!==undefined)$('guestName').value=String(rq[0].name||''); if(rq[0].whatsapp!==undefined)$('guestWhatsapp').value=String(rq[0].whatsapp||''); if(rq[0].relation!==undefined)$('guestRelation').value=String(rq[0].relation||''); if(rq[0].occasion!==undefined)$('guestOccasion').value=String(rq[0].occasion||''); if(rq[0].note!==undefined)$('guestNote').value=String(rq[0].note||''); }
    const tx=readSheet('texts');const en={},gu={},hi={};
    tx.forEach(r=>{const k=String(r.key||'').trim();if(!k)return; if(r.en_value!==undefined)en[k]=String(r.en_value||''); if(r.gu_value!==undefined)gu[k]=String(r.gu_value||''); if(r.hi_value!==undefined)hi[k]=String(r.hi_value||'');});
    S.GUEST_TEXTS={en,gu,hi};applyGuestTextsToFields(S.GUEST_EDIT_LANG);
    const sh=readSheet('shared');G.counters=G.counters||{};
    sh.forEach(r=>{ const k=String(r.key||'').trim();if(!k)return; const v=String(r.value==null?'':r.value); if(k==='theme'){G.theme=v.trim();return} if(/^ct[123]_(show|label|datetime|datetime_tz|dispdate)$/.test(k))G.counters[k]=v; });
    renderGuestCounters();
    G.gifts=readSheet('gifts').filter(r=>r.emoji||r.title||r.message||r.photo_drive_id).map(r=>({emoji:String(r.emoji||'🎁'),title:String(r.title||''),message:String(r.message||''),photo_drive_id:String(r.photo_drive_id||'')}));
    G.events=readSheet('events').filter(r=>r.icon||r.label||r.target_iso).map(r=>({icon:String(r.icon||'📅'),label:String(r.label||''),target_iso:String(r.target_iso||''),target_iso_tz:String(r.target_iso_tz||DEFAULT_TZ)}));
    G.voice=readSheet('voice').filter(r=>r.title||r.audio_url).map(r=>({title:String(r.title||''),audio_url:String(r.audio_url||'')}));
    G.video=readSheet('video').filter(r=>r.title||r.video_url).map(r=>({title:String(r.title||''),video_url:String(r.video_url||'')}));
    G.pins=readSheet('pins').filter(r=>r.label||r.lat||r.lng).map(r=>({label:String(r.label||''),lat:String(r.lat||''),lng:String(r.lng||''),photo_drive_id:String(r.photo_drive_id||''),story:String(r.story||'')}));
    G.story=readSheet('story').filter(r=>r.title||r.body).map(r=>({title:String(r.title||''),body:String(r.body||''),photo_drive_id:String(r.photo_drive_id||'')}));
    const mediaRows=readSheet('media').filter(r=>(r.drive_id||r.src)&&String(r.drive_id||r.src).trim()!=='');
    const rawMedia=mediaRows.map(r=>({type:String(r.type||'photo'),src:String(r.src||''),drive_id:String(r.drive_id||''),title:String(r.title||'')}));
    G.media=dedupeMedia(rawMedia);
    const privRows=readSheet('private_media').filter(r=>(r.drive_id||r.src)&&String(r.drive_id||r.src).trim()!=='');
    G.privateMedia=dedupeMedia(privRows.map(r=>({type:String(r.type||'photo'),src:String(r.src||''),drive_id:String(r.drive_id||''),title:String(r.title||''),priv:true})));
    renderGuestTheme();renderGuestGifts();renderGuestStory();renderGuestEvents();
    renderGuestVoice();renderGuestVideo();renderGuestPins();renderGuestMedia();renderGuestPrivate();
    st.textContent='✅ Imported!';st.className='panel-status ok';
  }catch(err){console.error(err);st.textContent='❌ '+(err.message||'Import failed');st.className='panel-status err'}
  finally{e.target.value=''}
};

function renderGuestPrivate(){ const w=$('guestPrivateRepeater');if(!w)return;w.innerHTML=''; (G.privateMedia||[]).forEach((m,i)=>{ const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Type</label><select class="panel-select" data-gprm="type" data-i="${i}"><option value="photo"${m.type==='photo'?' selected':''}>Photo</option><option value="video"${m.type==='video'?' selected':''}>Video</option></select></div><div class="panel-field"><label class="panel-label">Drive ID</label><input type="text" class="panel-input" data-gprm="drive_id" data-i="${i}" value="${(m.drive_id||'')}"></div><div class="panel-field"><label class="panel-label">Direct URL</label><input type="text" class="panel-input" data-gprm="src" data-i="${i}" value="${(m.src||'')}"></div><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gprm="title" data-i="${i}" value="${(m.title||'').replace(/"/g,'&quot;')}"></div>`; w.appendChild(row); }); w.querySelectorAll('input,select').forEach(el=>{el.onchange=el.oninput=()=>{G.privateMedia[+el.dataset.i][el.dataset.gprm]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{G.privateMedia.splice(+b.dataset.i,1);renderGuestPrivate()}}); }
$('guestAddPrivateRow').onclick=()=>{G.privateMedia=G.privateMedia||[];G.privateMedia.push({type:'photo',drive_id:'',src:'',title:'',priv:true});renderGuestPrivate()};
$('guestBulkAddPrivate').onclick=()=>{
  const v=$('g_privateIds').value||'';const pb=parseBulkMedia(v,{priv:true});
  if(!pb.total){__showToast('Paste at least one Drive ID or direct link',false);return}
  G.privateMedia=G.privateMedia||[];const before=G.privateMedia.length;
  pb.vids.forEach(m=>G.privateMedia.push(m));
  pb.photos.forEach(m=>G.privateMedia.push(m));
  G.privateMedia=dedupeMedia(G.privateMedia);const removed=(before+pb.total)-G.privateMedia.length;
  renderGuestPrivate();$('g_privateIds').value='';
  __showToast('✅ Added '+pb.vids.length+' private video(s) · '+pb.photos.length+' private photo(s)'+(removed>0?(' · '+removed+' duplicate(s) removed'):''));
};

$('guestSubmit').onclick=async()=>{
  saveGuestTextsFromFields(S.GUEST_EDIT_LANG);
  const st=$('guestStatus');
  const newName=$('newPersonName').value.trim();
  const newSlug=$('newPersonSlug').value.trim().toLowerCase().replace(/[^a-z0-9\-_]/g,'');
  const newBday=$('newPersonBirthday').value.trim();
  const gname=$('guestName').value.trim();
  const gwa=$('guestWhatsapp').value.trim();
  const rel=$('guestRelation').value;
  const occasion=$('guestOccasion').value;
  const note=$('guestNote').value.trim();
  const missing=[];
  if(!newName)missing.push('• Person\'s Display Name');
  if(!newSlug)missing.push('• Person\'s Login ID / Slug');
  if(!newBday)missing.push('• Person\'s Birthday');
  if(!gname)missing.push('• Your name');
  if(!gwa)missing.push('• Your WhatsApp number');
  if(!rel)missing.push('• Your relation to them');
  if(!occasion)missing.push('• Occasion');
  if(gwa&&gwa.replace(/\D/g,'').length<6)missing.push('• WhatsApp must have 6+ digits');
  if(missing.length){ alert('⚠️ Please fill all mandatory fields:\n\n'+missing.join('\n')); st.textContent='❌ Missing field(s).';st.className='panel-status err'; return; }
  const exists=S.PEOPLE.find(p=>p.slug===newSlug);
  if(exists){st.textContent='❌ Login ID already taken.';st.className='panel-status err';return}
  const sharedOut={};
  COUNTERS.forEach(c=>{
    sharedOut[c.labelKey]=G.counters[c.labelKey]!==undefined?G.counters[c.labelKey]:(S.GUEST_TEXTS.en[c.labelKey]||'');
    sharedOut[c.dtKey]=G.counters[c.dtKey]||'';
    sharedOut[c.tzKey]=G.counters[c.tzKey]||DEFAULT_TZ;
    sharedOut[c.dispKey]=G.counters[c.dispKey]||'';
    sharedOut[c.showKey]=G.counters[c.showKey]!==undefined?G.counters[c.showKey]:'true';
  });
  const dedupedPub=dedupeMedia(G.media||[]).map(m=>Object.assign({},m,{priv:false}));
  const dedupedPriv=dedupeMedia(G.privateMedia||[]).map(m=>Object.assign({},m,{priv:true,title:privTitle(stripPrivTitle(m.title))}));
  const dedupedMedia=dedupeMedia(dedupedPub.concat(dedupedPriv));
  const payload={
    person_proposal:{display_name:newName,slug:newSlug,birthday:newBday},
    guest_info:{name:gname,relation:rel,occasion:occasion,note:note,whatsapp:gwa},
    texts_en:S.GUEST_TEXTS.en||{},texts_gu:S.GUEST_TEXTS.gu||{},texts_hi:S.GUEST_TEXTS.hi||{},texts:S.GUEST_TEXTS.en||{},
    shared:sharedOut,theme:G.theme,gifts:G.gifts,story:G.story,events:G.events,
    voice:G.voice,video:G.video,pins:G.pins,
    media:dedupedMedia,mediaIds:dedupedMedia.map(m=>m.drive_id).filter(Boolean).join(', '),
    privateMedia:dedupedPriv,privateMediaIds:dedupedPriv.map(m=>m.drive_id).filter(Boolean).join(', ')
  };
  st.textContent='⏳ Submitting…';st.className='panel-status';
  try{
    const r=await fetch(`${SUPABASE_URL}/rest/v1/${T_GUEST}`,{method:'POST',headers:sb.h(),body:JSON.stringify({ guest_name:gname,guest_relation:rel,guest_whatsapp:gwa,target_person_slug:newSlug,payload,status:'pending' })});
    if(!r.ok){const t=await r.text();throw new Error('submit failed '+r.status+' '+t)}
    st.textContent='✅ Submitted!';st.className='panel-status ok';
    setTimeout(()=>{
      if(confirm('Submitted!\n\nWe will WhatsApp you the Login ID + View Key + Edit Key once approved.\n\nSend us a WhatsApp message now to speed up the approval?')){
        const msg='Hi Deep, I just submitted a request to add "'+newName+'". Please review and approve. Thank you!';
        window.open('https://wa.me/971553488512?text='+encodeURIComponent(msg),'_blank');
      }
      hide($('guestPanel'));
    },500);
  }catch(e){st.textContent='❌ '+e.message;st.className='panel-status err'}
};

function reSetLangActive(lang){ RE.lang=lang; document.querySelectorAll('#reLangTabs button').forEach(b=>b.classList.toggle('active',b.dataset.reLang===lang)); applyRETextsToFields(lang); }
function applyRETextsToFields(lang){ const src=(RE.texts&&RE.texts[lang])||{}; document.querySelectorAll('#reTextFields [data-re-text]').forEach(el=>{ const k=el.dataset.reText;if(!k)return; el.value=src[k]!==undefined?src[k]:''; }); }
function saveRETextsFromFields(){
  RE.texts=RE.texts||{en:{},gu:{},hi:{}};
  RE.texts[RE.lang]=RE.texts[RE.lang]||{};
  document.querySelectorAll('#reTextFields [data-re-text]').forEach(el=>{ const k=el.dataset.reText;if(!k)return; RE.texts[RE.lang][k]=el.value; });
}
function buildRETextFields(){
  const w=$('reTextFields');if(!w)return;
  if(w.dataset.built==='1')return;
  w.dataset.built='1';
  const groups=[
    {title:'💌 Main Card Text',fields:['pageTitle','mainHeadline','subhead1','subhead2','greeting','msg1','msg2','msg3','msg4','msg5','signoff','namesBadge','fromLabel','countersTitle','ct1_label','ct2_label','ct3_label','openMemoriesBtn','storyBtnText','mapBtnText','uploadBtnText','voiceBtnText','videoBtnText','giftSectionTitle','eventSectionTitle']},
    {title:'🎂 Opening / Cake / Lock',fields:['openLine1','openLine2','cakeHint','lockTitle','lockSubtitle','lockDateText','countdownLabel','daysLabel','hoursLabel','minsLabel','secsLabel','openEarlyText','pwError','pwLockedMsg']},
    {title:'💖 Closing Modal',fields:['closeTitle','close1','close2','close3','close4','closeSignoff','closeBtn']}
  ];
  const longFields=new Set(['msg1','msg2','msg3','msg4','msg5','close1','close2','close3','close4']);
  let html='';
  groups.forEach(g=>{
    html+='<div style="margin-bottom:1rem;"><div class="panel-section-title" style="color:var(--c-primary);">'+g.title+'</div>';
    g.fields.forEach(f=>{ const isLong=longFields.has(f); html+='<div class="panel-field"><label class="panel-label">'+f+'</label>'+(isLong?'<textarea class="panel-textarea" data-re-text="'+f+'"></textarea>':'<input type="text" class="panel-input" data-re-text="'+f+'">')+'</div>'; });
    html+='</div>';
  });
  w.innerHTML=html;
}
document.querySelectorAll('#reLangTabs button').forEach(btn=>{ btn.onclick=()=>{ saveRETextsFromFields(); reSetLangActive(btn.dataset.reLang); }; });

function renderREGifts(){ const w=$('reGiftsRepeater');if(!w)return;w.innerHTML=''; RE.gifts.forEach((g,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Emoji</label><input type="text" class="panel-input" data-rf="emoji" data-i="${i}" value="${(g.emoji||'🎁')}"></div><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-rf="title" data-i="${i}" value="${(g.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Message</label><textarea class="panel-textarea" data-rf="message" data-i="${i}">${(g.message||'')}</textarea></div><div class="panel-field"><label class="panel-label">Photo Drive ID (comma-separate for slideshow)</label><input type="text" class="panel-input" data-rf="photo_drive_id" data-i="${i}" value="${(g.photo_drive_id||'')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input,textarea').forEach(el=>{el.oninput=()=>{RE.gifts[+el.dataset.i][el.dataset.rf]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{RE.gifts.splice(+b.dataset.i,1);renderREGifts()}}); }
$('reAddGiftRow').onclick=()=>{RE.gifts.push({emoji:'🎁',title:'',message:'',photo_drive_id:''});renderREGifts()};
function renderREStory(){ const w=$('reStoryRepeater');if(!w)return;w.innerHTML=''; RE.story.forEach((s,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-rs="title" data-i="${i}" value="${(s.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Body</label><textarea class="panel-textarea" data-rs="body" data-i="${i}">${(s.body||'')}</textarea></div><div class="panel-field"><label class="panel-label">Photo Drive ID (comma-separate for slideshow)</label><input type="text" class="panel-input" data-rs="photo_drive_id" data-i="${i}" value="${(s.photo_drive_id||'')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input,textarea').forEach(el=>{el.oninput=()=>{RE.story[+el.dataset.i][el.dataset.rs]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{RE.story.splice(+b.dataset.i,1);renderREStory()}}); }
$('reAddStoryRow').onclick=()=>{RE.story.push({title:'',body:'',photo_drive_id:''});renderREStory()};
function renderREEvents(){ const w=$('reEventsRepeater');if(!w)return;w.innerHTML=''; RE.events.forEach((ev,i)=>{const row=document.createElement('div');row.className='repeat-row';
  const tz=ev.target_iso_tz||DEFAULT_TZ; const local=ev.target_iso?utcToZonedLocal(ev.target_iso,tz):'';
  const tzOptsHtml=TZ_OPTIONS.map(o=>`<option value="${o.v}"${o.v===tz?' selected':''}>${o.l}</option>`).join('');
  row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Icon</label><input type="text" class="panel-input" data-re2="icon" data-i="${i}" value="${(ev.icon||'📅')}"></div><div class="panel-field"><label class="panel-label">Label</label><input type="text" class="panel-input" data-re2="label" data-i="${i}" value="${(ev.label||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Target date &amp; time + timezone</label><div class="tz-row"><input type="datetime-local" class="panel-input" data-re2="target_local" data-i="${i}" value="${local}"><select class="panel-select tz-select" data-re2="target_tz" data-i="${i}">${tzOptsHtml}</select></div></div>`; w.appendChild(row)});
  w.querySelectorAll('input,select').forEach(el=>{
    el.oninput=el.onchange=()=>{
      const i=+el.dataset.i;
      if(el.dataset.re2==='target_local'){ const tzEl=w.querySelector('.tz-select[data-re2="target_tz"][data-i="'+i+'"]'); const tz=tzEl?tzEl.value:DEFAULT_TZ; RE.events[i].target_iso=el.value?zonedToUTC(el.value,tz):''; RE.events[i].target_iso_tz=tz; }
      else if(el.dataset.re2==='target_tz'){ const dtEl=w.querySelector('input[data-re2="target_local"][data-i="'+i+'"]'); const tz=el.value; RE.events[i].target_iso_tz=tz; if(dtEl&&dtEl.value)RE.events[i].target_iso=zonedToUTC(dtEl.value,tz); }
      else if(el.dataset.re2){ RE.events[i][el.dataset.re2]=el.value; }
    };
  });
  w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{RE.events.splice(+b.dataset.i,1);renderREEvents()}}); }
$('reAddEventRow').onclick=()=>{RE.events.push({icon:'📅',label:'',target_iso:'',target_iso_tz:DEFAULT_TZ});renderREEvents()};
function renderREVoice(){ const w=$('reVoiceRepeater');if(!w)return;w.innerHTML=''; RE.voice.forEach((v,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-rv="title" data-i="${i}" value="${(v.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Audio URL</label><input type="text" class="panel-input" data-rv="audio_url" data-i="${i}" value="${(v.audio_url||'')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input').forEach(el=>{el.oninput=()=>{RE.voice[+el.dataset.i][el.dataset.rv]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{RE.voice.splice(+b.dataset.i,1);renderREVoice()}}); }
$('reAddVoiceRow').onclick=()=>{RE.voice.push({title:'',audio_url:''});renderREVoice()};
function renderREVideo(){ const w=$('reVideoRepeater');if(!w)return;w.innerHTML=''; RE.video.forEach((v,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-rd="title" data-i="${i}" value="${(v.title||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Video URL</label><input type="text" class="panel-input" data-rd="video_url" data-i="${i}" value="${(v.video_url||'')}"></div>`; w.appendChild(row)}); w.querySelectorAll('input').forEach(el=>{el.oninput=()=>{RE.video[+el.dataset.i][el.dataset.rd]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{RE.video.splice(+b.dataset.i,1);renderREVideo()}}); }
$('reAddVideoRow').onclick=()=>{RE.video.push({title:'',video_url:''});renderREVideo()};
function renderREPins(){ const w=$('rePinsRepeater');if(!w)return;w.innerHTML=''; RE.pins.forEach((p,i)=>{const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Label</label><input type="text" class="panel-input" data-rp="label" data-i="${i}" value="${(p.label||'').replace(/"/g,'&quot;')}"></div><div class="panel-field"><label class="panel-label">Lat</label><input type="text" class="panel-input" data-rp="lat" data-i="${i}" value="${p.lat||''}"></div><div class="panel-field"><label class="panel-label">Lng</label><input type="text" class="panel-input" data-rp="lng" data-i="${i}" value="${p.lng||''}"></div><div class="panel-field"><label class="panel-label">Photo IDs (comma-separate for slideshow)</label><input type="text" class="panel-input" data-rp="photo_drive_id" data-i="${i}" value="${(p.photo_drive_id||'')}"></div><div class="panel-field"><label class="panel-label">Story</label><textarea class="panel-textarea" data-rp="story" data-i="${i}">${(p.story||'')}</textarea></div>`; w.appendChild(row)}); w.querySelectorAll('input,textarea').forEach(el=>{el.oninput=()=>{RE.pins[+el.dataset.i][el.dataset.rp]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{RE.pins.splice(+b.dataset.i,1);renderREPins()}}); }
$('reAddPinRow').onclick=()=>{RE.pins.push({label:'',lat:'',lng:'',photo_drive_id:'',story:''});renderREPins()};
function renderREMedia(){ const w=$('reMediaRepeater');if(!w)return;w.innerHTML=''; (RE.media||[]).forEach((m,i)=>{ const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Type</label><select class="panel-select" data-rm="type" data-i="${i}"><option value="photo"${m.type==='photo'?' selected':''}>Photo</option><option value="video"${m.type==='video'?' selected':''}>Video</option></select></div><div class="panel-field"><label class="panel-label">Drive ID</label><input type="text" class="panel-input" data-rm="drive_id" data-i="${i}" value="${(m.drive_id||'')}"></div><div class="panel-field"><label class="panel-label">Direct URL</label><input type="text" class="panel-input" data-rm="src" data-i="${i}" value="${(m.src||'')}"></div><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-rm="title" data-i="${i}" value="${(m.title||'').replace(/"/g,'&quot;')}"></div>`; w.appendChild(row); }); w.querySelectorAll('input,select').forEach(el=>{el.onchange=el.oninput=()=>{RE.media[+el.dataset.i][el.dataset.rm]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{RE.media.splice(+b.dataset.i,1);renderREMedia()}}); }
$('reAddMediaRow').onclick=()=>{RE.media=RE.media||[];RE.media.push({type:'photo',drive_id:'',src:'',title:''});renderREMedia()};
$('reBulkAddMedia').onclick=()=>{
  const v=$('re_bulkMediaIds').value||'';const pb=parseBulkMedia(v);
  if(!pb.total){__showToast('Paste at least one Drive ID or direct link',false);return}
  RE.media=RE.media||[];const before=RE.media.length;
  pb.vids.forEach(m=>RE.media.push(m));
  pb.photos.forEach(m=>RE.media.push(m));
  RE.media=dedupeMedia(RE.media);const removed=(before+pb.total)-RE.media.length;
  renderREMedia();$('re_bulkMediaIds').value='';
  __showToast('✅ Added '+pb.vids.length+' video(s) · '+pb.photos.length+' photo(s)'+(removed>0?(' · '+removed+' duplicate(s) removed'):''));
};
function renderRETheme(){document.querySelectorAll('#reThemeGrid .theme-swatch').forEach(el=>el.classList.toggle('selected',el.dataset.reTheme===RE.theme))}
document.querySelectorAll('#reThemeGrid .theme-swatch').forEach(el=>{el.onclick=()=>{RE.theme=el.dataset.reTheme;renderRETheme()}});
function renderRECounters(){
  [1,2,3].forEach(n=>{ const el=$('re_ct'+n+'_show'); if(el)el.checked=(String(RE.counters['ct'+n+'_show'])!=='false'); });
  document.querySelectorAll('#re-pane-counters .re-ctr-tz').forEach(el=>{ const key=el.dataset.rc;if(!key)return; fillTzSelect(el,RE.counters[key]||DEFAULT_TZ); el.value=RE.counters[key]||DEFAULT_TZ; });
  document.querySelectorAll('#re-pane-counters .re-ctr').forEach(el=>{
    const key=el.dataset.rc;if(!key)return;
    if(key.endsWith('_datetime')){ const tzKey=key+'_tz'; const tz=RE.counters[tzKey]||DEFAULT_TZ; el.value=RE.counters[key]?utcToZonedLocal(RE.counters[key],tz):''; }
    else { el.value=RE.counters[key]!==undefined?RE.counters[key]:''; }
  });
}
document.querySelectorAll('#re-pane-counters .re-ctr').forEach(el=>{
  const handler=()=>{
    const k=el.dataset.rc;if(!k)return;
    if(k.endsWith('_datetime')){ const tzKey=k+'_tz'; const tzSel=document.querySelector('#re-pane-counters .re-ctr-tz[data-rc="'+tzKey+'"]'); const tz=tzSel?tzSel.value:DEFAULT_TZ; RE.counters[k]=el.value?zonedToUTC(el.value,tz):''; }
    else { RE.counters[k]=el.value; }
  };
  el.addEventListener('input',handler); el.addEventListener('change',handler);
});
document.querySelectorAll('#re-pane-counters .re-ctr-tz').forEach(el=>{
  el.addEventListener('change',()=>{
    const tzKey=el.dataset.rc;if(!tzKey)return;
    RE.counters[tzKey]=el.value;
    const dtKey=tzKey.replace(/_tz$/,'');
    const dtEl=document.querySelector('#re-pane-counters .re-ctr[data-rc="'+dtKey+'"]');
    if(dtEl&&dtEl.value)RE.counters[dtKey]=zonedToUTC(dtEl.value,el.value);
  });
});
[1,2,3].forEach(n=>{ const el=$('re_ct'+n+'_show'); if(el)el.onchange=()=>{RE.counters['ct'+n+'_show']=el.checked?'true':'false'}; });

document.querySelectorAll('#requesterEditModal .panel-tab').forEach(tab=>{
  tab.onclick=()=>{
    document.querySelectorAll('#requesterEditModal .panel-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('#requesterEditModal .panel-pane').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    const p=$(tab.dataset.rePane);if(p)p.classList.add('active');
  };
});

async function openRequesterEditor(){
  const p=S.CURRENT_PERSON;if(!p){alert('No person.');return}
  const set=S.CURRENT_SETTINGS||{};
  const byLang={en:{},gu:{},hi:{}};
  TEXT_FIELDS.forEach(f=>{
    byLang.en[f]=set['texts__en_'+f]!==undefined?set['texts__en_'+f]:(set['texts__'+f]||'');
    byLang.gu[f]=set['texts__gu_'+f]!==undefined?set['texts__gu_'+f]:'';
    byLang.hi[f]=set['texts__hi_'+f]!==undefined?set['texts__hi_'+f]:'';
  });
  RE.texts=byLang;
  RE.shared=Object.assign({},S.CURR.shared||{});
  RE.theme=RE.shared.theme||'romantic';
  RE.counters={};
  COUNTERS.forEach(c=>{
    if(RE.shared[c.labelKey]!==undefined)RE.counters[c.labelKey]=RE.shared[c.labelKey];
    if(RE.shared[c.dtKey]!==undefined)RE.counters[c.dtKey]=RE.shared[c.dtKey];
    if(RE.shared[c.tzKey]!==undefined)RE.counters[c.tzKey]=RE.shared[c.tzKey];
    if(RE.shared[c.dispKey]!==undefined)RE.counters[c.dispKey]=RE.shared[c.dispKey];
    if(RE.shared[c.showKey]!==undefined)RE.counters[c.showKey]=RE.shared[c.showKey];
  });
  RE.gifts=JSON.parse(JSON.stringify(S.CURR.gifts||[]));
  RE.story=JSON.parse(JSON.stringify(S.CURR.story||[]));
  RE.events=JSON.parse(JSON.stringify(S.CURR.events||[]));
  RE.voice=JSON.parse(JSON.stringify(S.CURR.voice||[]));
  RE.video=JSON.parse(JSON.stringify(S.CURR.video||[]));
  RE.pins=JSON.parse(JSON.stringify(S.CURR.pins||[]));
  { const spRE=splitMedia(JSON.parse(JSON.stringify(S.CURR.media||[])));
    RE.media=spRE.pub; RE.privateMedia=spRE.priv.map(m=>Object.assign({},m,{priv:true})); }
  buildRETextFields();
  reSetLangActive('en');
  renderRETheme();renderRECounters();
  renderREGifts();renderREStory();renderREEvents();
  renderREVoice();renderREVideo();renderREPins();renderREMedia();renderREPrivate();
  $('re_bulkMediaIds').value='';$('re_bulkPrivateIds').value='';
  document.querySelectorAll('#requesterEditModal .panel-tab').forEach((t,i)=>t.classList.toggle('active',i===0));
  document.querySelectorAll('#requesterEditModal .panel-pane').forEach((p,i)=>p.classList.toggle('active',i===0));
  const st=$('reStatus');if(st){st.textContent='';st.className='panel-status'}
  txt($('requesterEditSub'),'Editing card for '+(p.display_name||p.slug)+'. Your changes will be saved to the cloud.');
  show($('requesterEditModal'));
}
$('requesterEditClose').onclick=()=>hide($('requesterEditModal'));
$('reCancel').onclick=()=>hide($('requesterEditModal'));
$('viewerEditCardBtn').onclick=()=>openRequesterEditor();

function renderREPrivate(){ const w=$('rePrivateRepeater');if(!w)return;w.innerHTML=''; (RE.privateMedia||[]).forEach((m,i)=>{ const row=document.createElement('div');row.className='repeat-row'; row.innerHTML=`<button type="button" class="repeat-remove" data-i="${i}">✕</button><div class="panel-field"><label class="panel-label">Type</label><select class="panel-select" data-rpm="type" data-i="${i}"><option value="photo"${m.type==='photo'?' selected':''}>Photo</option><option value="video"${m.type==='video'?' selected':''}>Video</option></select></div><div class="panel-field"><label class="panel-label">Drive ID</label><input type="text" class="panel-input" data-rpm="drive_id" data-i="${i}" value="${(m.drive_id||'')}"></div><div class="panel-field"><label class="panel-label">Direct URL</label><input type="text" class="panel-input" data-rpm="src" data-i="${i}" value="${(m.src||'')}"></div><div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-rpm="title" data-i="${i}" value="${stripPrivTitle(m.title).replace(/"/g,'&quot;')}"></div>`; w.appendChild(row); }); w.querySelectorAll('input,select').forEach(el=>{el.onchange=el.oninput=()=>{RE.privateMedia[+el.dataset.i][el.dataset.rpm]=el.value}}); w.querySelectorAll('.repeat-remove').forEach(b=>{b.onclick=()=>{RE.privateMedia.splice(+b.dataset.i,1);renderREPrivate()}}); }
$('reAddPrivateRow').onclick=()=>{RE.privateMedia=RE.privateMedia||[];RE.privateMedia.push({type:'photo',drive_id:'',src:'',title:'',priv:true});renderREPrivate()};
$('reBulkAddPrivate').onclick=()=>{
  const v=$('re_bulkPrivateIds').value||'';const pb=parseBulkMedia(v,{priv:true});
  if(!pb.total){__showToast('Paste at least one Drive ID or direct link',false);return}
  RE.privateMedia=RE.privateMedia||[];const before=RE.privateMedia.length;
  pb.vids.forEach(m=>RE.privateMedia.push(m));
  pb.photos.forEach(m=>RE.privateMedia.push(m));
  RE.privateMedia=dedupeMedia(RE.privateMedia);const removed=(before+pb.total)-RE.privateMedia.length;
  renderREPrivate();$('re_bulkPrivateIds').value='';
  __showToast('✅ Added '+pb.vids.length+' private video(s) · '+pb.photos.length+' private photo(s)'+(removed>0?(' · '+removed+' duplicate(s) removed'):''));
};

$('reSave').onclick=async()=>{
  const st=$('reStatus');
  const p=S.CURRENT_PERSON;if(!p||!p.id){st.textContent='❌ No person';st.className='panel-status err';return}
  saveRETextsFromFields();
  const pid=p.id;
  const settings={};
  ['en','gu','hi'].forEach(lang=>{ const tl=RE.texts[lang]||{}; TEXT_FIELDS.forEach(f=>{settings['texts__'+lang+'_'+f]=tl[f]!==undefined?tl[f]:''}); });
  const newShared=Object.assign({},RE.shared||{});
  newShared.theme=RE.theme||'romantic';
  COUNTERS.forEach(c=>{
    newShared[c.labelKey]=RE.counters[c.labelKey]!==undefined?RE.counters[c.labelKey]:'';
    newShared[c.dtKey]=RE.counters[c.dtKey]||'';
    newShared[c.tzKey]=RE.counters[c.tzKey]||DEFAULT_TZ;
    newShared[c.dispKey]=RE.counters[c.dispKey]||'';
    newShared[c.showKey]=RE.counters[c.showKey]!==undefined?RE.counters[c.showKey]:'true';
  });
  Object.keys(newShared).forEach(k=>{settings['shared__'+k]=newShared[k]});
  st.textContent='⏳ Saving…';st.className='panel-status';
  try{
    await sb.upSet(settings,pid);
    const wi=async(table,rows)=>{ await sb.wipe(table,pid); const clean=rows.filter(r=>r); if(clean.length)await sb.insBatch(table,clean); };
    await Promise.all([
      wi(T_GIFTS,(RE.gifts||[]).filter(g=>g.title||g.message||g.photo_drive_id).map(g=>({person_id:pid,emoji:g.emoji||'🎁',title:g.title||'',message:g.message||'',photo_drive_id:g.photo_drive_id||''}))),
      wi(T_STORY,(RE.story||[]).filter(s=>s.title||s.body).map(s=>({person_id:pid,title:s.title||'',body:s.body||'',photo_drive_id:s.photo_drive_id||''}))),
      wi(T_EVENTS,(RE.events||[]).filter(e=>e.label||e.target_iso).map(e=>({person_id:pid,icon:e.icon||'📅',label:e.label||'',target_iso:e.target_iso||''}))),
      wi(T_VOICE,(RE.voice||[]).filter(v=>v.audio_url).map(v=>({person_id:pid,title:v.title||'',audio_url:v.audio_url||''}))),
      wi(T_VIDEO,(RE.video||[]).filter(v=>v.video_url).map(v=>({person_id:pid,title:v.title||'',video_url:v.video_url||''}))),
      wi(T_PINS,(RE.pins||[]).filter(x=>x.lat&&x.lng).map(x=>({person_id:pid,label:x.label||'',lat:x.lat,lng:x.lng,photo_drive_id:x.photo_drive_id||'',story:x.story||''}))),
      wi(T_MEDIA,dedupeMedia(((RE.media||[]).concat(RE.privateMedia||[])).filter(m=>m.drive_id||m.src)).map(m=>{const row={person_id:pid,type:m.type||'photo',drive_id:m.drive_id||'',src:m.src||'',title:m.title||'',sort_order:0}; if(isPrivateRow(m)||m.priv===true)row.priv=true; return row;}))
    ]);
    st.textContent='✅ Saved!';st.className='panel-status ok';
    __showToast('💾 Card updated');
    await loadPersonIntoState(p);
    hide($('requesterEditModal'));
    renderCardFull();
  }catch(e){st.textContent='❌ '+e.message;st.className='panel-status err'}
};

async function boot(){
  document.body.setAttribute('data-theme','romantic');
  initAllTzSelects();
  const emo=['❤️','💛','🌹','💕','✨','💗','🌺','💝','🌸','💞'];
  for(let i=0;i<18;i++){
    const sp=document.createElement('span');sp.className='float-item';
    sp.textContent=emo[Math.floor(Math.random()*emo.length)];
    sp.style.left=(Math.random()*100)+'%';
    sp.style.fontSize=(1.2+Math.random()*1.4)+'rem';
    sp.style.animationDuration=(9+Math.random()*9)+'s';
    sp.style.animationDelay=(Math.random()*8)+'s';
    document.body.appendChild(sp);
  }
  try{ await sb.wipeExpired(); }catch(e){}
  // HD0.6/HD1.1: pull the cloud Finished ledger BEFORE first paint so finished people
  // never flash on the active grid and 💐 tiles are complete on first render (R19)
  try{ await pullFinishedLedger(); }catch(e){}
  S.PEOPLE=await sb.people()||[];
  const gs=await sb.getSet(null);
  S.CURR.shared={adminPassword:(gs&&gs['shared__adminPassword'])||FALLBACK_ADMIN_PW,adminLoginEnabled:(gs&&gs['shared__adminLoginEnabled'])};
  if(window.buildHome)window.buildHome();
  if(window.updateFinishedBadge)updateFinishedBadge();
  // Background maintenance (non-blocking): sync ledger + due people, repaint only when changed
  (async()=>{
    try{
      const c1=await pullFinishedLedger();
      const c2=await syncFinishedFromCloud();
      if(c1||c2){S.PEOPLE=await sb.people()||S.PEOPLE;if(window.buildHome)buildHome();if(window.renderFinishedSection)renderFinishedSection();}
    }catch(e){}
  })();
  if(SS_restoreSession && SS_restoreSession()) return;
  await checkWipe();
  await loadReviews();
  setInterval(checkWipe,60000);
  const urlP=new URLSearchParams(location.search).get('person');
  if(urlP){
    const p=S.PEOPLE.find(x=>x.slug===urlP);
    if(p)setTimeout(()=>{
      const ep=window.homeVisiblePeople();
      const btns=document.querySelectorAll('#homeGrid .home-btn');
      const idx=ep.findIndex(x=>x.id===p.id);
      if(idx>=0&&btns[idx])btns[idx].click();
    },400);
  }
}
/* ---- debug/test hooks (used by automated verification; harmless in production) ---- */
window.__T={S:S,GE:GE,RE:RE,G:G,openGuestEditor:openGuestEditor,openRequesterEditor:openRequesterEditor,
  buildGEPayload:buildGEPayload,renderCardFull:renderCardFull,splitMedia:splitMedia,hide:hide,show:show,
  loadPersonIntoState:loadPersonIntoState,isPrivateRow:isPrivateRow};

boot();

})();

