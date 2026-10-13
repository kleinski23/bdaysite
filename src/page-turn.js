const motion=matchMedia('(prefers-reduced-motion: reduce)');
export async function turnPaper(element, direction, replace) {
  const token=String(Number(element.dataset.turnToken||0)+1);element.dataset.turnToken=token;
  for(const animation of element.getAnimations())animation.cancel();
  if(direction && !motion.matches && element.firstElementChild) {
    const outgoing=element.animate([
      {opacity:1,transform:'perspective(1100px) rotateY(0deg) translateX(0)'},
      {opacity:0,transform:`perspective(1100px) rotateY(${-direction*13}deg) translateX(${-direction*32}px)`},
    ],{duration:150,easing:'ease-in',fill:'none'});
    try{await outgoing.finished;}catch{}
    if(element.dataset.turnToken!==token)return;
  }
  replace();
  if(direction && !motion.matches)element.animate([
    {opacity:.2,transform:`perspective(1100px) rotateY(${direction*11}deg) translateX(${direction*36}px)`},
    {opacity:1,transform:'perspective(1100px) rotateY(0deg) translateX(0)'},
  ],{duration:280,easing:'cubic-bezier(.2,.7,.2,1)'});
}
export function makeSwipeable(element, turn) {
  let start=null;
  element.addEventListener('pointerdown',event=>{
    if(event.button!==0 || event.target.closest('button,a,input,textarea,select'))return;
    start={x:event.clientX,y:event.clientY,id:event.pointerId,time:performance.now()};
    element.setPointerCapture(event.pointerId);
  });
  element.addEventListener('pointerup',event=>{
    if(!start || event.pointerId!==start.id)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y,elapsed=performance.now()-start.time;start=null;
    if(Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.4 && elapsed<1800)turn(dx<0?1:-1);
  });
  element.addEventListener('pointercancel',()=>{start=null;});
}
