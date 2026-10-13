import {turnPaper,makeSwipeable} from './page-turn.js';
const form=document.querySelector('#guest-wish-form');
const name=document.querySelector('#guest-name');
const message=document.querySelector('#guest-message');
const submit=document.querySelector('#post-wish');
const status=document.querySelector('#wish-form-status');
const board=document.querySelector('#guest-wishes');
const count=document.querySelector('#wish-count');
const pagination=document.querySelector('#guest-pagination');
const position=document.querySelector('#guest-page-position');
const previous=document.querySelector('#previous-guest-page');
const next=document.querySelector('#next-guest-page');
const hint=document.querySelector('#guest-swipe-hint');
const pageDialog=document.querySelector('#wish-page-dialog');
const reader=document.querySelector('.wish-reader-content');
let wishes=[],request=0,pendingId=null,pendingText='',filter='all',openWishId=null,currentWishId=null,renderedKey='';
const ownIds=new Set();
// Wishes posted in this visit, kept until the shared (briefly cached) list includes them.
const posted=new Map();
try{const saved=JSON.parse(localStorage.getItem('julia-slumbook-pages')||'[]');if(Array.isArray(saved))for(const id of saved)if(typeof id==='string')ownIds.add(id);}catch{}
board.tabIndex=0;board.setAttribute('role','region');board.setAttribute('aria-roledescription','carousel');board.setAttribute('aria-label','Guest pages. Swipe or use the arrow keys to turn pages.');
function orderedWishes(){return [...wishes].reverse().filter(wish=>filter==='all'||ownIds.has(wish.id));}
function openPage(id,direction=0){
  const list=orderedWishes(),index=list.findIndex(wish=>wish.id===id);if(index<0)return;
  openWishId=id;const wish=list[index];
  currentWishId=id;render();
  pageDialog.querySelector('.wish-page-toolbar>span').textContent=ownIds.has(id)?'YOUR SAVED PAGE / JULIA’S SLUMBOOK':'A PAGE IN JULIA’S SLUMBOOK';
  document.querySelector('#wish-page-number').textContent='PAGE '+(index+1)+' / '+list.length;
  document.querySelector('#previous-wish').disabled=index===0;document.querySelector('#next-wish').disabled=index===list.length-1;
  const replace=()=>{
    document.querySelector('#wish-page-message').textContent=wish.message;
    document.querySelector('#wish-page-author').textContent=wish.name;
    reader.scrollTop=0;
  };
  if(!pageDialog.open){replace();pageDialog.showModal();}else turnPaper(reader,direction,replace);
}
function turnReader(direction){
  const list=orderedWishes(),index=list.findIndex(wish=>wish.id===openWishId);
  if(list[index+direction])openPage(list[index+direction].id,direction);
}
document.querySelector('#close-wish-page').addEventListener('click',()=>pageDialog.close());
document.querySelector('#previous-wish').addEventListener('click',()=>turnReader(-1));
document.querySelector('#next-wish').addEventListener('click',()=>turnReader(1));
pageDialog.addEventListener('click',event=>{const r=pageDialog.getBoundingClientRect();if(event.target===pageDialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))pageDialog.close();});
pageDialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();turnReader(event.key==='ArrowRight'?1:-1);}});
makeSwipeable(reader,turnReader);
function makeNote(wish,index){
  const note=document.createElement('article');note.className='wish-note note-'+index%4;note.dataset.wishId=wish.id;
  const to=document.createElement('span');to.className='note-to';to.textContent=ownIds.has(wish.id)?'YOUR PAGE / FOR JULIA':'GUEST PAGE / FOR JULIA';
  const salutation=document.createElement('span');salutation.className='note-salutation';salutation.textContent='Dear Julia,';
  const words=document.createElement('p');words.textContent=wish.message;
  const from=document.createElement('h3');from.textContent=wish.name;
  const date=document.createElement('time');date.dateTime=wish.createdAt;date.textContent=new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'Asia/Singapore'}).format(new Date(wish.createdAt));
  const read=document.createElement('button');read.type='button';read.className='read-wish-page';read.textContent='Read the full wish ↗';read.setAttribute('aria-label','Read wish from '+wish.name);read.addEventListener('click',()=>openPage(wish.id));
  note.append(to,salutation,words,from,date,read);return note;
}
function render(direction=0){
  const list=orderedWishes();
  let index=list.findIndex(wish=>wish.id===currentWishId);
  if(index<0){index=0;currentWishId=list[0]?.id||null;}
  count.textContent=list.length?list.length+' '+(list.length===1?'PAGE':'PAGES')+' OF BIRTHDAY LOVE':'A LITTLE LOVE, FROM EVERYONE';
  pagination.hidden=!list.length;hint.hidden=list.length<2;
  position.textContent='PAGE '+(index+1)+' / '+list.length;
  previous.disabled=index===0;next.disabled=index>=list.length-1;
  if(!list.length){
    const key='empty:'+filter;if(renderedKey===key)return;renderedKey=key;
    turnPaper(board,0,()=>{
      const empty=document.createElement('div');empty.className='board-empty';
      const heart=document.createElement('span');heart.textContent='♡';heart.setAttribute('aria-hidden','true');
      const heading=document.createElement('h3');heading.textContent=filter==='mine'?'A page with your name on it.':'The first page could be yours.';
      const text=document.createElement('p');text.textContent=filter==='mine'?'Write your wish on the paper beside this book. Your saved pages will appear here on this browser.':'Write a birthday wish and watch it become a little page in Julia’s keepsake slumbook.';
      empty.append(heart,heading,text);board.replaceChildren(empty);
    });return;
  }
  const wish=list[index],key=JSON.stringify(wish)+':'+ownIds.has(wish.id);
  if(key===renderedKey)return;renderedKey=key;
  turnPaper(board,direction,()=>board.replaceChildren(makeNote(wish,index)));
}
function turnGuestPage(direction){
  const list=orderedWishes(),index=list.findIndex(wish=>wish.id===currentWishId);
  if(!list[index+direction])return;currentWishId=list[index+direction].id;render(direction);
}
previous.addEventListener('click',()=>turnGuestPage(-1));next.addEventListener('click',()=>turnGuestPage(1));
makeSwipeable(board,turnGuestPage);
board.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();turnGuestPage(event.key==='ArrowRight'?1:-1);}});
async function refresh(){
  const current=++request;
  try{
    const response=await fetch('/api/wishes',{cache:'no-store'});if(!response.ok)throw new Error();
    const data=await response.json();if(current!==request)return;wishes=data.wishes;
    const serverIds=new Set(wishes.map(wish=>wish.id));
    for(const [id,wish] of posted)if(serverIds.has(id))posted.delete(id);else wishes.push(wish);
    const existingIds=new Set(wishes.map(wish=>wish.id));for(const id of ownIds)if(!existingIds.has(id))ownIds.delete(id);
    try{localStorage.setItem('julia-slumbook-pages',JSON.stringify([...ownIds]));}catch{}
    render();if(status.dataset.loadError){status.textContent='';delete status.dataset.loadError;}
  }catch{if(current===request){status.textContent='The pages couldn’t load. Try Refresh pages in a moment.';status.dataset.loadError='true';}}
}
for(const field of [name,message])field.addEventListener('input',()=>field.setCustomValidity(''));
form.addEventListener('submit',async event=>{
  event.preventDefault();if(submit.disabled)return;
  for(const field of [name,message])if(!field.value.trim()){field.setCustomValidity('Please add '+(field===name?'your name.':'a little birthday message.'));field.reportValidity();return;}
  const value={name:name.value.trim(),message:message.value.trim()},text=JSON.stringify(value);
  if(!pendingId||pendingText!==text){pendingId=crypto.randomUUID();pendingText=text;}
  submit.disabled=true;submit.setAttribute('aria-busy','true');status.textContent='Adding your page to Julia’s slumbook…';delete status.dataset.loadError;
  try{
    const response=await fetch('/api/wishes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...value,requestId:pendingId})});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Your wish couldn’t be saved. Please try again.');
    ++request;ownIds.add(result.wish.id);posted.set(result.wish.id,result.wish);try{localStorage.setItem('julia-slumbook-pages',JSON.stringify([...ownIds]));}catch{}
    wishes=[...wishes.filter(wish=>wish.id!==result.wish.id),result.wish];currentWishId=result.wish.id;render();
    message.value='';pendingId=null;pendingText='';status.textContent='Your page is saved. Find it in the guest pages or under Your pages. ♡';
    openPage(result.wish.id);
  }catch(error){status.textContent=error.message||'Your wish couldn’t be saved. Please try again.';}
  finally{submit.disabled=false;submit.removeAttribute('aria-busy');}
});
document.querySelector('#refresh-wishes').addEventListener('click',refresh);
for(const button of document.querySelectorAll('[data-wish-filter]'))button.addEventListener('click',()=>{
  filter=button.dataset.wishFilter;currentWishId=null;document.querySelectorAll('[data-wish-filter]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));render();
});
let visible=false;const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)refresh();});observer.observe(document.querySelector('#wishes'));
const timer=setInterval(()=>{if(visible&&!document.hidden&&!submit.disabled)refresh();},30000);
document.addEventListener('visibilitychange',()=>{if(visible&&!document.hidden)refresh();});
window.addEventListener('pagehide',()=>{clearInterval(timer);observer.disconnect();},{once:true});
refresh();
