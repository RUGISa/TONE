const cfg = window.MOOD_CONFIG || {};
const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes('YOUR_');
const db = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
const views = ['profileView','authView','signupView','calendarView','diaryView','friendsView'];
const el = Object.fromEntries([
  'profileGrid','newProfileBtn','authBackBtn','authAvatar','authName','loginForm','loginPassword','loginError',
  'signupBackBtn','signupForm','signupDisplayName','signupUsername','signupPassword','signupError','calendarGrid','monthTitle',
  'prevMonth','nextMonth','todayBtn','friendsBtn','meBtn','meAvatar','meName','backBtn','dateTitle','weekdayTitle','moodInput',
  'titleInput','contentInput','youtubeInput','saveBtn','deleteBtn','playBtn','stopBtn','record','recordPhoto','arm','youtubePlayer',
  'savedMark','playerState','friendsBackBtn','logoutBtn','addFriendForm','friendUsername','friendError','friendList',
  'conversationEmpty','conversation','friendAvatar','friendName','friendId','messageList','messageForm','messageInput'
].map(id => [id, $(id)]));

let session = null;
let me = null;
let chosenProfile = null;
let selectedDate = '';
let selectedFriend = null;
let monthEntries = {};
let currentVideoId = null;
let playTimer = null;
let isPlaying = false;
const now = new Date();
let calendarYear = now.getFullYear();
let calendarMonth = now.getMonth();

function showView(id){ views.forEach(v => $(v).hidden = v !== id); }
function pad(n){ return String(n).padStart(2,'0'); }
function fmtDate(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function dateStr(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; }
function authEmail(username){ return `${username.toLowerCase()}@mooddiary.app`; }
function avatarStyle(seed=0){
  const tones = [['#6f4933','#d9b38f'],['#4c5a4c','#c8bca1'],['#6c564a','#d9cbb7'],['#665648','#c39a77'],['#3f4c52','#b4a58d']];
  const [a,b] = tones[Math.abs(Number(seed)||0)%tones.length];
  return `radial-gradient(circle at 32% 28%, ${b} 0 13%, transparent 14%), linear-gradient(145deg, ${b}, ${a})`;
}
function paintAvatar(node, profile){ if(node) node.style.background = avatarStyle(profile?.avatar_seed || 0); }
function message(node,text,isError=true){ node.textContent=text||''; node.classList.toggle('ok', !isError); }
function ensureConfigured(){
  if (configured) return true;
  el.profileGrid.innerHTML = `<div class="setup-note"><strong>Supabase 연결이 필요해요.</strong><br>config.js에 Project URL과 anon key를 넣으면 프로필 기능이 시작됩니다.</div>`;
  el.newProfileBtn.disabled = true;
  return false;
}

async function loadProfiles(){
  showView('profileView');
  if(!ensureConfigured()) return;
  el.profileGrid.innerHTML = '<div class="loading">profiles...</div>';
  const {data,error} = await db.from('profiles').select('id,username,display_name,avatar_seed').order('created_at');
  if(error){ el.profileGrid.innerHTML = `<div class="setup-note">${error.message}</div>`; return; }
  el.profileGrid.innerHTML='';
  (data||[]).forEach(profile => {
    const btn=document.createElement('button');
    btn.className='profile-tile';
    const av=document.createElement('span'); av.className='avatar profile-avatar'; paintAvatar(av,profile);
    const name=document.createElement('strong'); name.textContent=profile.display_name;
    const id=document.createElement('small'); id.textContent=`@${profile.username}`;
    btn.append(av,name,id);
    btn.addEventListener('click',()=>openLogin(profile));
    el.profileGrid.appendChild(btn);
  });
  if(!data?.length) el.profileGrid.innerHTML='<div class="empty-profiles">아직 프로필이 없어요.</div>';
}

function openLogin(profile){
  chosenProfile=profile; el.authName.textContent=profile.display_name; paintAvatar(el.authAvatar,profile);
  el.loginPassword.value=''; message(el.loginError,''); showView('authView'); setTimeout(()=>el.loginPassword.focus(),50);
}

async function login(e){
  e.preventDefault(); if(!chosenProfile) return;
  message(el.loginError,'');
  const {data,error}=await db.auth.signInWithPassword({email:authEmail(chosenProfile.username),password:el.loginPassword.value});
  if(error){ message(el.loginError,'비밀번호가 맞지 않아요.'); return; }
  session=data.session; await enterApp();
}

async function signup(e){
  e.preventDefault(); message(el.signupError,'');
  const display_name=el.signupDisplayName.value.trim();
  const username=el.signupUsername.value.trim();
  const password=el.signupPassword.value;
  if(!/^[A-Za-z0-9_]{2,18}$/.test(username)){ message(el.signupError,'아이디는 영문, 숫자, _만 사용할 수 있어요.'); return; }
  const {data,error}=await db.auth.signUp({email:authEmail(username),password});
  if(error){ message(el.signupError,error.message.includes('already')?'이미 사용 중인 아이디예요.':error.message); return; }
  if(!data.user){ message(el.signupError,'프로필을 만들 수 없어요.'); return; }
  const avatar_seed=Math.floor(Math.random()*1000);
  const {error:profileError}=await db.from('profiles').insert({id:data.user.id,username,display_name,avatar_seed});
  if(profileError){ await db.auth.signOut(); message(el.signupError,profileError.message); return; }
  session=data.session || (await db.auth.getSession()).data.session;
  if(!session){ message(el.signupError,'Supabase에서 Confirm email을 꺼주세요.'); return; }
  await enterApp();
}

async function enterApp(){
  const user=session?.user || (await db.auth.getUser()).data.user;
  if(!user){ await loadProfiles(); return; }
  const {data,error}=await db.from('profiles').select('*').eq('id',user.id).single();
  if(error){ await db.auth.signOut(); await loadProfiles(); return; }
  me=data; el.meName.textContent=me.display_name; paintAvatar(el.meAvatar,me);
  showView('calendarView'); await renderCalendar();
}

async function renderCalendar(){
  const start=dateStr(calendarYear,calendarMonth,1);
  const end=dateStr(calendarYear,calendarMonth,new Date(calendarYear,calendarMonth+1,0).getDate());
  const {data}=await db.from('diaries').select('diary_date,mood,title,youtube').gte('diary_date',start).lte('diary_date',end).order('diary_date');
  monthEntries=Object.fromEntries((data||[]).map(x=>[x.diary_date,x]));
  const first=new Date(calendarYear,calendarMonth,1).getDay();
  const days=new Date(calendarYear,calendarMonth+1,0).getDate();
  const weeks=Math.ceil((first+days)/7);
  el.monthTitle.textContent=`${calendarYear}. ${pad(calendarMonth+1)}`;
  el.calendarGrid.style.setProperty('--weeks',weeks); el.calendarGrid.innerHTML='';
  for(let i=0;i<first;i++) el.calendarGrid.appendChild(Object.assign(document.createElement('div'),{className:'calendar-blank'}));
  const today=fmtDate(new Date());
  for(let d=1;d<=days;d++){
    const key=dateStr(calendarYear,calendarMonth,d), entry=monthEntries[key];
    const b=document.createElement('button'); b.className='calendar-day'; if(key===today)b.classList.add('today');
    b.innerHTML=`<span class="day-number">${d}</span>`;
    if(entry){
      const p=document.createElement('div'); p.className='entry-preview';
      p.innerHTML=`<strong>${escapeHtml(entry.title||'기록')}</strong><span>${escapeHtml(entry.mood||'')}</span>`; b.appendChild(p);
      if(entry.youtube) b.insertAdjacentHTML('beforeend','<span class="song-dot"></span>');
    }
    b.addEventListener('click',()=>openDiary(key)); el.calendarGrid.appendChild(b);
  }
  for(let i=first+days;i<weeks*7;i++) el.calendarGrid.appendChild(Object.assign(document.createElement('div'),{className:'calendar-blank'}));
}
function escapeHtml(s=''){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

async function openDiary(key){
  selectedDate=key; stopMusic(true);
  const [y,m,d]=key.split('-').map(Number), dt=new Date(y,m-1,d);
  el.dateTitle.textContent=`${y}. ${pad(m)}. ${pad(d)}`;
  el.weekdayTitle.textContent=['SUN','MON','TUE','WED','THU','FRI','SAT'][dt.getDay()];
  const {data}=await db.from('diaries').select('*').eq('user_id',me.id).eq('diary_date',key).maybeSingle();
  el.moodInput.value=data?.mood||'평온'; el.titleInput.value=data?.title||''; el.contentInput.value=data?.content||''; el.youtubeInput.value=data?.youtube||'';
  el.savedMark.textContent=data?'saved':''; updateMusic(); showView('diaryView');
}

async function saveEntry(){
  if(!selectedDate)return;
  const row={user_id:me.id,diary_date:selectedDate,mood:el.moodInput.value,title:el.titleInput.value.trim(),content:el.contentInput.value.trim(),youtube:el.youtubeInput.value.trim(),updated_at:new Date().toISOString()};
  if(!row.title&&!row.content&&!row.youtube)return;
  const {error}=await db.from('diaries').upsert(row,{onConflict:'user_id,diary_date'});
  el.savedMark.textContent=error?'error':'saved';
}
async function deleteEntry(){ if(!selectedDate)return; await db.from('diaries').delete().eq('user_id',me.id).eq('diary_date',selectedDate); el.titleInput.value='';el.contentInput.value='';el.youtubeInput.value='';el.savedMark.textContent='';updateMusic(); }

function extractYouTubeId(raw){
  try{const u=new URL(raw.trim()),h=u.hostname.replace(/^www\./,''); if(h==='youtu.be')return u.pathname.split('/').filter(Boolean)[0]||null; if(h.endsWith('youtube.com')){if(u.pathname==='/watch')return u.searchParams.get('v');const p=u.pathname.split('/').filter(Boolean);if(['embed','shorts','live'].includes(p[0]))return p[1]||null;}}catch{} return null;
}
function setArtwork(id){
  if(!id){el.recordPhoto.style.backgroundImage='none';return;}
  const list=[`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,`https://i.ytimg.com/vi/${id}/hq720.jpg`,`https://i.ytimg.com/vi/${id}/sddefault.jpg`,`https://i.ytimg.com/vi/${id}/mqdefault.jpg`];
  const go=i=>{if(i>=list.length){el.recordPhoto.style.backgroundImage='none';return;}const img=new Image();img.onload=()=>{if(img.naturalWidth>200)el.recordPhoto.style.backgroundImage=`url("${list[i]}")`;else go(i+1)};img.onerror=()=>go(i+1);img.src=list[i];}; go(0);
}
function updateMusic(){currentVideoId=extractYouTubeId(el.youtubeInput.value);stopMusic(true);setArtwork(currentVideoId);el.playBtn.disabled=!currentVideoId;el.stopBtn.disabled=!currentVideoId;el.playerState.textContent=currentVideoId?'READY':'NO TRACK';}
function playMusic(){if(!currentVideoId||isPlaying||playTimer)return;el.arm.classList.add('playing');el.playerState.textContent='LOWERING';el.playBtn.disabled=true;playTimer=setTimeout(()=>{playTimer=null;el.youtubePlayer.innerHTML=`<iframe width="1" height="1" src="https://www.youtube.com/embed/${currentVideoId}?autoplay=1&playsinline=1" allow="autoplay; encrypted-media"></iframe>`;el.record.classList.add('playing');isPlaying=true;el.playerState.textContent='PLAYING';el.stopBtn.disabled=false;},650);}
function stopMusic(immediate=false){if(playTimer){clearTimeout(playTimer);playTimer=null;}el.youtubePlayer.innerHTML='';el.record.classList.remove('playing');isPlaying=false;if(immediate)el.arm.classList.remove('playing');else setTimeout(()=>el.arm.classList.remove('playing'),80);if(currentVideoId){el.playBtn.disabled=false;el.stopBtn.disabled=false;el.playerState.textContent=immediate?'READY':'STOPPED';}else{el.playBtn.disabled=true;el.stopBtn.disabled=true;el.playerState.textContent='NO TRACK';}}

async function openFriends(){ showView('friendsView'); selectedFriend=null; el.conversation.hidden=true;el.conversationEmpty.hidden=false; await loadFriends(); }
async function loadFriends(){
  const uid=me.id;
  const {data,error}=await db.from('friendships').select('*').or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);
  if(error){message(el.friendError,error.message);return;}
  const ids=[...new Set((data||[]).map(f=>f.requester_id===uid?f.addressee_id:f.requester_id))];
  el.friendList.innerHTML=''; if(!ids.length){el.friendList.innerHTML='<div class="friend-empty">아직 친구가 없어요.</div>';return;}
  const {data:profiles}=await db.from('profiles').select('*').in('id',ids);
  (profiles||[]).forEach(p=>{const b=document.createElement('button');b.className='friend-row';const a=document.createElement('span');a.className='avatar small';paintAvatar(a,p);const t=document.createElement('span');t.innerHTML=`<strong>${escapeHtml(p.display_name)}</strong><small>@${escapeHtml(p.username)}</small>`;b.append(a,t);b.addEventListener('click',()=>selectFriend(p));el.friendList.appendChild(b);});
}
async function addFriend(e){
  e.preventDefault(); const username=el.friendUsername.value.trim(); message(el.friendError,''); if(!username)return;
  const {data:friend,error}=await db.from('profiles').select('*').eq('username',username).maybeSingle();
  if(error||!friend){message(el.friendError,'그 아이디의 프로필을 찾지 못했어요.');return;} if(friend.id===me.id){message(el.friendError,'내 프로필은 추가할 수 없어요.');return;}
  const uid=me.id; const {data:existing}=await db.from('friendships').select('id').or(`and(requester_id.eq.${uid},addressee_id.eq.${friend.id}),and(requester_id.eq.${friend.id},addressee_id.eq.${uid})`).maybeSingle();
  if(existing){message(el.friendError,'이미 친구예요.',false);return;}
  const {error:insertError}=await db.from('friendships').insert({requester_id:uid,addressee_id:friend.id,status:'accepted'});
  if(insertError){message(el.friendError,insertError.message);return;} el.friendUsername.value=''; message(el.friendError,'친구를 추가했어요.',false); await loadFriends();
}
async function selectFriend(profile){selectedFriend=profile;el.conversationEmpty.hidden=true;el.conversation.hidden=false;paintAvatar(el.friendAvatar,profile);el.friendName.textContent=profile.display_name;el.friendId.textContent=`@${profile.username}`;await loadMessages();}
async function loadMessages(){
  if(!selectedFriend)return; const a=me.id,b=selectedFriend.id;
  const {data}=await db.from('messages').select('*').or(`and(sender_id.eq.${a},receiver_id.eq.${b}),and(sender_id.eq.${b},receiver_id.eq.${a})`).order('created_at',{ascending:true}).limit(100);
  el.messageList.innerHTML='';(data||[]).forEach(m=>{const d=document.createElement('div');d.className='message '+(m.sender_id===me.id?'mine':'theirs');d.innerHTML=`<p>${escapeHtml(m.body)}</p><time>${new Date(m.created_at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time>`;el.messageList.appendChild(d);}); el.messageList.scrollTop=el.messageList.scrollHeight;
}
async function sendMessage(e){e.preventDefault();if(!selectedFriend)return;const body=el.messageInput.value.trim();if(!body)return;const {error}=await db.from('messages').insert({sender_id:me.id,receiver_id:selectedFriend.id,body});if(!error){el.messageInput.value='';await loadMessages();}}

el.newProfileBtn.addEventListener('click',()=>{el.signupForm.reset();message(el.signupError,'');showView('signupView');});
el.authBackBtn.addEventListener('click',loadProfiles);el.signupBackBtn.addEventListener('click',loadProfiles);el.loginForm.addEventListener('submit',login);el.signupForm.addEventListener('submit',signup);
el.prevMonth.addEventListener('click',()=>{calendarMonth--;if(calendarMonth<0){calendarMonth=11;calendarYear--;}renderCalendar();});
el.nextMonth.addEventListener('click',()=>{calendarMonth++;if(calendarMonth>11){calendarMonth=0;calendarYear++;}renderCalendar();});
el.todayBtn.addEventListener('click',()=>{const d=new Date();calendarYear=d.getFullYear();calendarMonth=d.getMonth();renderCalendar();});
el.backBtn.addEventListener('click',async()=>{stopMusic(true);showView('calendarView');await renderCalendar();});el.saveBtn.addEventListener('click',saveEntry);el.deleteBtn.addEventListener('click',deleteEntry);
el.playBtn.addEventListener('click',playMusic);el.stopBtn.addEventListener('click',()=>stopMusic(false));el.youtubeInput.addEventListener('input',updateMusic);
[el.titleInput,el.contentInput,el.moodInput,el.youtubeInput].forEach(x=>x.addEventListener('input',()=>el.savedMark.textContent=''));
el.friendsBtn.addEventListener('click',openFriends);el.friendsBackBtn.addEventListener('click',async()=>{showView('calendarView');await renderCalendar();});el.addFriendForm.addEventListener('submit',addFriend);el.messageForm.addEventListener('submit',sendMessage);
el.logoutBtn.addEventListener('click',async()=>{await db.auth.signOut();session=null;me=null;await loadProfiles();});
el.meBtn.addEventListener('click',openFriends);

(async function init(){
  if(!ensureConfigured()){showView('profileView');return;}
  const {data}=await db.auth.getSession(); session=data.session;
  if(session) await enterApp(); else await loadProfiles();
})();
