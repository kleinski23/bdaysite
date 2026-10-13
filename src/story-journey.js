import { launchMeteors } from './night-sky.js';
const hero = document.querySelector('#home');
const dusk = document.querySelector('#prologue');
const story = document.querySelector('#story');
const night = document.querySelector('#story-night-world');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const stars = [...document.querySelectorAll('[data-wish-star]')];
const lit = new Set();
const status = document.querySelector('#constellation-status');
const progress = document.querySelector('#star-progress');
const reset = document.querySelector('#reset-stars');
const url = new URL(location.href); url.searchParams.delete('hero'); history.replaceState(null, '', url);
document.querySelector('#world-mode').addEventListener('click', () => story.scrollIntoView({behavior:motion.matches?'instant':'smooth'}));
function shoot() { launchMeteors(3); status.textContent = 'A wish across the sky, for all she’ll become. ♡'; }
document.querySelector('#moon-glow').addEventListener('click', shoot);
function light(index) {
  if(lit.has(index)) return;
  lit.add(index); stars[index].setAttribute('aria-pressed','true');
  progress.textContent = '';
  const complete = lit.size === stars.length;
  night.classList.toggle('constellation-complete', complete);
  status.textContent = complete ? 'One beautiful year. A universe of love ahead.' : ['A little joy, for every new day.','A little wonder, for every adventure.','A little love, wherever she goes.','A little courage, as her world grows.','A little laughter, always.'][lit.size-1];
  reset.hidden = !complete;
  document.querySelector('#light-sky').textContent = '';
  document.dispatchEvent(new CustomEvent('birthday-star',{detail:{index,complete}}));
  if(complete) launchMeteors(3);
}
stars.forEach((star,index)=>star.addEventListener('click',()=>light(index)));
document.querySelector('#light-sky').addEventListener('click',()=>{const next=stars.findIndex((_,index)=>!lit.has(index));if(next<0)shoot();else light(next);});
reset.addEventListener('click',()=>{lit.clear();for(const star of stars)star.setAttribute('aria-pressed','true');night.classList.remove('constellation-complete');status.textContent='';document.querySelector('#light-sky').textContent='';reset.hidden=true;document.querySelector('#light-sky').focus();});
const portraits = {
  sunshine:{src:'/assets/story-lavender-3d.webp',alt:'3D storybook Julia smiling in her lavender dress',kicker:'THE SMILE THAT STARTED EVERYTHING',caption:'A little sunshine, even after the sun goes down.'},
  wonder:{src:'/assets/story-garden-3d.webp',alt:'3D storybook Julia carrying a flower pot in her lavender dress',kicker:'WONDER IN THE LITTLE THINGS',caption:'A tiny bouquet, a thousand ways to say we love you.'},
  kisses:{src:'/assets/story-pink-3d.webp',alt:'3D storybook Julia in her pink birthday dress and crown',kicker:'ONE YEAR OF THE SWEETEST LOVE',caption:'A little birthday kiss, for everyone in her story.'},
};
let portraitRequest = 0;
const portrait = document.querySelector('#story-portrait');
for(const button of document.querySelectorAll('[data-story-portrait]')) button.addEventListener('click',async()=>{
  const request=++portraitRequest;const selected=portraits[button.dataset.storyPortrait];
  try {
    const image=new Image();image.src=selected.src;await image.decode();if(request!==portraitRequest)return;
    portrait.src=selected.src;portrait.alt=selected.alt;
    document.querySelectorAll('[data-story-portrait]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
    document.querySelector('#story-portrait-kicker').textContent=selected.kicker;
    document.querySelector('#story-portrait-caption').textContent=selected.caption;
    if(!motion.matches) portrait.animate([{opacity:.3,filter:'blur(5px)'},{opacity:1,filter:'blur(0)'}],{duration:450,easing:'ease-out'});
  } catch {if(request===portraitRequest)document.querySelector('#story-portrait-caption').textContent='This portrait couldn’t load. Please try again.';}
});
const dial = document.querySelector('#day-dial');
const dialPath = document.querySelector('#dial-path');
const dialLit = document.querySelector('#dial-lit');
const dialBody = document.querySelector('#dial-body');
const moments = [...document.querySelectorAll('.day-moment')];
const narrowDial = matchMedia('(max-width: 900px)');
const dialLength = dialPath ? dialPath.getTotalLength() : 0;
function layoutMoments() {
  // seat each photo medallion on the arc (viewBox is 1000 × 320 and the stage keeps that ratio)
  for(const moment of moments) {
    if(narrowDial.matches){moment.style.left=moment.style.top='';continue;}
    const point=dialPath.getPointAtLength(dialLength*Number(moment.dataset.at));
    moment.style.left=point.x/10+'%';moment.style.top=point.y/3.2+'%';
  }
}
function placeSun() {
  if(!dial) return;
  const rect=dial.getBoundingClientRect();
  if(narrowDial.matches) {
    const day=Math.max(0,Math.min(1,(innerHeight*.7-rect.top)/rect.height));
    dial.style.setProperty('--day',day.toFixed(3));
    dial.dataset.time=day<.55?'day':'night';
    for(const moment of moments) moment.classList.toggle('is-lit',moment.getBoundingClientRect().top<innerHeight*.72);
    return;
  }
  const day=Math.max(0,Math.min(1,(innerHeight*.88-rect.top)/(innerHeight*.62)));
  const along=.02+day*.96;
  const point=dialPath.getPointAtLength(dialLength*along);
  dialBody.setAttribute('transform',`translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`);
  dialLit.style.strokeDasharray=`${(dialLength*along).toFixed(1)} ${dialLength.toFixed(1)}`;
  dial.style.setProperty('--day',day.toFixed(3));
  dial.style.setProperty('--sun-x',point.x/10+'%');
  dial.style.setProperty('--sun-y',point.y/3.2+'%');
  dial.dataset.time=along<.74?'day':'night';
  for(const moment of moments) moment.classList.toggle('is-lit',along>=Number(moment.dataset.at)-.03);
}
if(dial){layoutMoments();narrowDial.addEventListener('change',()=>{layoutMoments();placeSun();});}
const worldDays = document.querySelector('#world-days');
if(worldDays) {
  const party = new Date('2026-10-25T11:30:00+08:00');
  const days = Math.floor((party - Date.now()) / 86400000);
  const left = party - Date.now();
  worldDays.textContent = days > 1 ? `${days} days to go` : days === 1 ? '1 day to go' : left > 0 ? 'Almost party time!' : left > -43200000 ? 'Today is the day!' : 'Thank you for celebrating ♡';
}
let scrollFrame = 0;
function updateJourney() {
  scrollFrame=0;
  const rect=dusk.getBoundingClientRect();
  const amount=Math.max(0,Math.min(1,(innerHeight*.8-rect.top)/(rect.height+innerHeight*.1)));
  dusk.style.setProperty('--dusk-progress',amount.toFixed(3));
  dusk.dataset.phase=amount<.32?'morning':amount<.68?'sunset':'night';
  placeSun();
  const r=story.getBoundingClientRect();
  document.body.classList.toggle('hero-night', (rect.top < innerHeight*.1 && amount>.65 || r.top<110) && r.bottom>110);
}
window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateJourney);},{passive:true});
window.addEventListener('resize',updateJourney);updateJourney();
for(const surface of [hero,night]) {
  surface.addEventListener('pointermove',event=>{if(motion.matches||event.pointerType!=='mouse')return;const r=surface.getBoundingClientRect();surface.style.setProperty('--sky-x',((event.clientX-r.left)/r.width-.5)*10+'px');surface.style.setProperty('--sky-y',((event.clientY-r.top)/r.height-.5)*6+'px');});
  surface.addEventListener('pointerleave',()=>{surface.style.setProperty('--sky-x','0px');surface.style.setProperty('--sky-y','0px');});
}
