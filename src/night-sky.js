const hero = document.querySelector('#story-night-world');
const scene = document.querySelector('#story-dreamscape');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
// Each head leads its trail toward the upper right, reversing the old flight.
const variants = [
  {length:74, duration:1500, x:240, y:-150, color:'#fff9df'},
  {length:120, duration:2200, x:300, y:-185, color:'#d7eeff'},
  {length:170, duration:2800, x:340, y:-210, color:'#ffe0a0'},
];
let variantIndex = 0;
export function launchMeteors(count = 1) {
  if (motion.matches || hero.dataset.design !== '2' || document.hidden) return;
  const layer = scene.querySelector('.meteor-layer');
  if (layer.childElementCount > 9) return;
  for (let i = 0; i < count; i++) {
    const variant = variants[variantIndex++ % variants.length];
    const meteor = document.createElement('span'); meteor.className = 'sky-meteor';
    meteor.style.left = (6 + Math.random() * 28) + '%';
    meteor.style.top = (34 + Math.random() * 30) + '%';
    meteor.style.setProperty('--meteor-length', variant.length + 'px');
    meteor.style.setProperty('--meteor-time', variant.duration + 'ms');
    meteor.style.setProperty('--meteor-delay', i * 330 + 'ms');
    meteor.style.setProperty('--meteor-x', variant.x + 'px');
    meteor.style.setProperty('--meteor-y', variant.y + 'px');
    meteor.style.setProperty('--meteor-color', variant.color);
    layer.append(meteor);
    meteor.addEventListener('animationend', () => meteor.remove(), {once:true});
  }
}
const meteorLayer = document.createElement('div'); meteorLayer.className = 'meteor-layer night-only';
meteorLayer.setAttribute('aria-hidden', 'true'); scene.append(meteorLayer);
scene.querySelector('.shooting-star')?.remove();
const canvas = document.createElement('canvas'); canvas.className = 'twinkling-sky night-only';
canvas.setAttribute('aria-hidden', 'true'); hero.prepend(canvas);
const context = canvas.getContext('2d');
let width = 0, height = 0, visible = true, frame = 0, lastDraw = 0, lastMeteor = 0;
let points = [], exclusions = [], bursts = [];
const pointer = {x:-1000,y:-1000};
function resize() {
  const rect = hero.getBoundingClientRect(); width = rect.width; height = rect.height;
  const scale = Math.min(devicePixelRatio, 1.5);
  canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
  context?.setTransform(scale,0,0,scale,0,0);
  points = Array.from({length:width < 600 ? 65 : 115}, () => ({x:Math.random()*width,y:Math.random()*height*.88,size:.55+Math.random()*1.05,phase:Math.random()*Math.PI*2,speed:.6+Math.random()*1.2}));
  exclusions = [...hero.querySelectorAll('.story-night-copy,.story-star-receipt,.story-portrait,.moon-control')].map(element => {
    const r = element.getBoundingClientRect(); return {left:r.left-rect.left-8,right:r.right-rect.left+8,top:r.top-rect.top-8,bottom:r.bottom-rect.top+8};
  });
  if (motion.matches) draw(0);
}
function draw(time) {
  if (!context) return;
  context.clearRect(0,0,width,height);
  if (hero.dataset.design !== '2') return;
  for (const star of points) {
    if (exclusions.some(r => star.x>r.left && star.x<r.right && star.y>r.top && star.y<r.bottom)) continue;
    const distance = Math.hypot(star.x-pointer.x,star.y-pointer.y);
    const glow = motion.matches ? 0 : Math.max(0,1-distance/110);
    const twinkle = motion.matches ? .6 : (.5 + .5*Math.sin(time*.001*star.speed+star.phase))**2;
    const x = star.x + (motion.matches ? 0 : (pointer.x-width/2)*.004*glow);
    const y = star.y + (motion.matches ? 0 : (pointer.y-height/2)*.004*glow);
    context.fillStyle = `rgba(255,255,255,${.15+twinkle*.7+glow*.15})`;
    context.shadowBlur = 4+glow*10; context.shadowColor='#e7f7ff';
    context.beginPath();context.arc(x,y,star.size+glow*.7,0,Math.PI*2);context.fill();
  }
  for (const burst of bursts) {
    const age = (time-burst.time)/1400;
    if (age<0 || age>1) continue;
    context.fillStyle=`rgba(241,249,255,${(1-age)*.9})`;context.shadowBlur=7;
    for(let i=0;i<12;i++) {const angle=i/12*Math.PI*2;context.beginPath();context.arc(burst.x+Math.cos(angle)*age*65,burst.y+Math.sin(angle)*age*65,1.8*(1-age)+.3,0,Math.PI*2);context.fill();}
  }
  context.shadowBlur=0; bursts=bursts.filter(b=>(time-b.time)<1400);
}
function animate(time) {
  frame = 0;
  if (!visible || document.hidden || motion.matches || hero.dataset.design !== '2') return;
  if (time-lastDraw>32) {draw(time);lastDraw=time;}
  if (hero.dataset.design==='2' && time-lastMeteor>10000) {launchMeteors();lastMeteor=time;}
  frame=requestAnimationFrame(animate);
}
function start() {if(!frame && visible && !document.hidden && !motion.matches && hero.dataset.design === '2') frame=requestAnimationFrame(animate);}
hero.addEventListener('pointermove', event => {
  if(event.pointerType!=='mouse') return;const rect=hero.getBoundingClientRect();pointer.x=event.clientX-rect.left;pointer.y=event.clientY-rect.top;
});
hero.addEventListener('pointerleave',()=>{pointer.x=pointer.y=-1000;});
hero.addEventListener('click',event=>{
  if(hero.dataset.design!=='2' || event.target.closest('button,a,input,select,textarea,.story-night-copy') || motion.matches) return;
  const rect=hero.getBoundingClientRect();bursts.push({x:event.clientX-rect.left,y:event.clientY-rect.top,time:performance.now()});
  bursts=bursts.slice(-5);launchMeteors();
});
const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(hero);
const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();});observer.observe(hero);
const designObserver=new MutationObserver(()=>{resize();start();});designObserver.observe(hero,{attributes:true,attributeFilter:['data-design']});
document.addEventListener('visibilitychange',start);
motion.addEventListener('change',()=>{if(motion.matches){cancelAnimationFrame(frame);frame=0;scene.querySelectorAll('.sky-meteor').forEach(m=>m.remove());draw(0);}else start();});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);resizeObserver.disconnect();observer.disconnect();designObserver.disconnect();},{once:true});
resize();start();
