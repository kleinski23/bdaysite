// A lightweight, decorative sky: pointer interaction never intercepts content.
export function initStarField() {
  const canvas=document.querySelector('#star-field');
  const ctx=canvas.getContext('2d'); if(!ctx)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let width=0,height=0,stars=[],frame=0,lastDraw=0,bounds=[],boundsPending=false;
  const pointer={x:-1000,y:-1000}; const ripples=[];
  function readBounds(){boundsPending=false;bounds=[...document.querySelectorAll('#home,.hero-copy,.memory-card,.memory-copy,.story-heading,.invitation,.prologue-copy,.wish-copy,.wish-receipt,.cake-button,.header,dialog[open]')].map(el=>el.getBoundingClientRect()).filter(r=>r.bottom>0&&r.top<height);}
  function queueBounds(){if(!boundsPending){boundsPending=true;requestAnimationFrame(readBounds);}}
  function resize(){width=innerWidth;height=innerHeight;const scale=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);ctx.setTransform(scale,0,0,scale,0,0);stars=Array.from({length:width<600?22:45},()=>({x:Math.random()*width,y:Math.random()*height,dx:0,dy:0,size:.5+Math.random()*.7,phase:Math.random()*Math.PI*2,speed:.3+Math.random()*.5,cross:Math.random()>.94}));readBounds();if(motion.matches)draw(0);}
  function isCovered(x,y){return bounds.some(r=>x>r.left-6&&x<r.right+6&&y>r.top-6&&y<r.bottom+6);}
  function draw(time){ctx.clearRect(0,0,width,height);const night=document.body.classList.contains('night-world'),t=time*.001;
    for(const s of stars){const distance=Math.hypot(s.x-pointer.x,s.y-pointer.y);const nearby=distance<90&&!motion.matches;const force=nearby?(1-distance/90)*10:0;const angle=Math.atan2(s.y-pointer.y,s.x-pointer.x);s.dx+=(Math.cos(angle)*force-s.dx)*.055;s.dy+=(Math.sin(angle)*force-s.dy)*.055;const x=s.x+s.dx,y=s.y+s.dy;if(isCovered(x,y))continue;const flicker=motion.matches?.5:(Math.sin(t*s.speed+s.phase)+1)/2;const alpha=(night?.09:.06)+flicker*.10+(nearby?.06:0);ctx.strokeStyle=ctx.fillStyle=`rgba(${night?'221,207,228':'168,145,164'},${alpha})`;ctx.shadowColor='#d8c4d5';ctx.shadowBlur=nearby?4:0;ctx.beginPath();ctx.arc(x,y,s.size,0,Math.PI*2);ctx.fill();if(s.cross&&flicker>.75){const size=2+flicker;ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(x-size,y);ctx.lineTo(x+size,y);ctx.moveTo(x,y-size);ctx.lineTo(x,y+size);ctx.stroke();}}
    ctx.shadowBlur=0;
    for(let i=ripples.length-1;i>=0;i--){const r=ripples[i],age=(time-r.time)/1000;if(age>1.2){ripples.splice(i,1);continue;}ctx.strokeStyle=`rgba(168,145,164,${(1-age/1.2)*.09})`;ctx.lineWidth=.7;ctx.beginPath();ctx.arc(r.x,r.y,8+age*38,0,Math.PI*2);ctx.stroke();}
  }
  function animate(time){if(document.hidden||motion.matches){frame=0;return;}if(time-lastDraw>32){draw(time);lastDraw=time;}frame=requestAnimationFrame(animate);}
  function start(){if(!frame&&!document.hidden&&!motion.matches)frame=requestAnimationFrame(animate);}
  window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){pointer.x=e.clientX;pointer.y=e.clientY;}},{passive:true});
  document.addEventListener('pointerleave',()=>{pointer.x=pointer.y=-1000;});
  window.addEventListener('pointerdown',e=>{if(motion.matches||e.target.closest('dialog,button,a,input,select')||isCovered(e.clientX,e.clientY))return;if(ripples.length>=3)ripples.shift();ripples.push({x:e.clientX,y:e.clientY,time:performance.now()});},{passive:true});
  window.addEventListener('scroll',queueBounds,{passive:true});window.addEventListener('resize',resize);
  new MutationObserver(queueBounds).observe(document.querySelector('#photo-dialog'),{attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',start);
  motion.addEventListener('change',()=>{if(motion.matches){cancelAnimationFrame(frame);frame=0;draw(0);}else start();});
  window.addEventListener('pagehide',()=>cancelAnimationFrame(frame),{once:true});
  resize();start();
}
