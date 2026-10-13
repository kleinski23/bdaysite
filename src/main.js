import './style.css';
import './enchanted.css';
import './bedtime.css';
import './album.css';
import './wishes.css';
import './hero-polish.css';
import './picnic.css';
import './birthday-sky.css';
import './cloud-hero.css';
import './postcard.js';
import './hero-worlds.css';
import './story-journey.js';
import './story-journey.css';
import './story-redesign.js';
import './story-redesign.css';
import './chapter-redesign.css';
import './wish-board.js';
import './slumbook.css';
import './slumbook-paging.css';
import './little-world.css';
import './footer.css';
import './hero-upgrade.css';
import './header.css';
import './music.css';
import { initStarField } from './star-field.js';
initStarField();
import { createIcons, VolumeX, Volume2, ArrowUpRight, CalendarDays, ArrowDown, Music2, RotateCw, Expand, MapPin, CalendarPlus, RotateCcw, X, ChevronLeft, ChevronRight, ChevronDown, Sunrise, Sun, Sunset, Moon, Clock, Play, Pause, SkipBack, SkipForward } from 'lucide';

const icons = { VolumeX, Volume2, ArrowUpRight, CalendarDays, ArrowDown, Music2, RotateCw, Expand, MapPin, CalendarPlus, RotateCcw, X, ChevronLeft, ChevronRight, ChevronDown, Sunrise, Sun, Sunset, Moon, Clock, Play, Pause, SkipBack, SkipForward };
const refreshIcons = () => createIcons({ icons });
refreshIcons();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const celebrationDate = new Date('2026-10-25T11:30:00+08:00');
function updateCountdown() {
  const remaining = Math.max(0, celebrationDate.getTime() - Date.now());
  document.querySelector('#days').textContent = String(Math.floor(remaining / 86400000)).padStart(2, '0');
  document.querySelector('#hours').textContent = String(Math.floor(remaining / 3600000) % 24).padStart(2, '0');
  document.querySelector('#minutes').textContent = String(Math.floor(remaining / 60000) % 60).padStart(2, '0');
  if (!remaining) document.querySelector('#countdown-caption').textContent = 'A little wonder, celebrated with so much love.';
}
updateCountdown();
setInterval(updateCountdown, 30000);

// Public-domain lullabies, arranged for a little steel-comb music box.
// Each song: melody + bass roots as [midi, beats]; a null midi is a rest. Bass roots roll into gentle arpeggios.
let audioContext, musicTimer, masterGain, room, roomGain, musicOut, songBus, tickBuffer;
let soundOn = false, audioRequest = 0;
const activeVoices = new Set();
const phraseA = [[72,1],[72,1],[79,1],[79,1],[81,1],[81,1],[79,2],[77,1],[77,1],[76,1],[76,1],[74,1],[74,1],[72,2]];
const phraseB = [[79,1],[79,1],[77,1],[77,1],[76,1],[76,1],[74,2]];
const bassA = [[48,2],[48,2],[53,2],[48,2],[53,2],[48,2],[55,2],[48,2]];
const bassB = [[48,2],[53,2],[48,2],[55,2]];
const frereBar = [[48,2],[55,2]];
const lullabies = [
  {id:'twinkle', title:'Twinkle, Twinkle, Little Star', beat:.62, meter:4, pickup:0,
    melody:[...phraseA,...phraseB,...phraseB,...phraseA], bass:[...bassA,...bassB,...bassB,...bassA]},
  {id:'brahms', title:'Brahms’ Lullaby', beat:.56, meter:3, pickup:1,
    melody:[[76,.5],[76,.5],[79,1.5],[76,.5],[76,1],[79,2],[76,.5],[79,.5],[84,1],[83,1.5],[81,.5],[81,1],[79,1],[74,.5],[76,.5],[77,1],[74,1],[74,.5],[76,.5],[77,2],[74,.5],[77,.5],[83,.5],[81,.5],[79,1],[83,1],[84,2],[72,.5],[72,.5],[84,2],[81,.5],[77,.5],[79,2],[76,.5],[72,.5],[77,1],[79,1],[81,1],[79,2],[72,.5],[72,.5],[84,2],[81,.5],[77,.5],[79,2],[77,.5],[74,.5],[72,3]],
    bass:[[null,1],[48,3],[48,3],[48,3],[55,3],[55,3],[55,3],[55,3],[48,3],[53,3],[48,3],[55,3],[48,3],[53,3],[55,3],[48,3]]},
  {id:'frere', title:'Are You Sleeping', beat:.58, meter:4, pickup:0,
    melody:[[72,1],[74,1],[76,1],[72,1],[72,1],[74,1],[76,1],[72,1],[76,1],[77,1],[79,2],[76,1],[77,1],[79,2],[79,.5],[81,.5],[79,.5],[77,.5],[76,1],[72,1],[79,.5],[81,.5],[79,.5],[77,.5],[76,1],[72,1],[72,1],[67,1],[72,2],[72,1],[67,1],[72,2]],
    bass:Array.from({length:8}, () => frereBar).flat()},
  {id:'birthday', title:'Happy Birthday, Julia', beat:.6, meter:3, pickup:1,
    melody:[[79,.75],[79,.25],[81,1],[79,1],[84,1],[83,2],[79,.75],[79,.25],[81,1],[79,1],[86,1],[84,2],[79,.75],[79,.25],[91,1],[88,1],[84,1],[83,1],[81,1],[89,.75],[89,.25],[88,1],[84,1],[86,1],[84,3]],
    bass:[[null,1],[48,3],[55,3],[55,3],[48,3],[48,3],[53,3],[55,3],[48,3]]},
];
let songIndex = 0, songEvents = [], eventIndex = 0, songStart = 0, songLength = 0;
const songGap = 1.8;
function arpeggio(root, beats) {
  const shape = beats >= 4 ? [0,7,12,7] : beats >= 3 ? [0,7,12] : beats >= 2 ? [0,7] : [0];
  const step = beats / shape.length;
  return shape.map((interval, index) => [root + interval, step, index]);
}
function buildSong(song) {
  const total = song.melody.reduce((sum, [, beats]) => sum + beats, 0);
  // a music box winds down: the last bar slows a little before the next song
  const seconds = beatPosition => song.beat * (beatPosition + .3 * Math.max(0, beatPosition - (total - 3)) ** 2 / 3);
  const events = [];
  let position = 0;
  for (const [midi, beats] of song.melody) {
    if (midi !== null) { const downbeat = ((position - song.pickup) % song.meter + song.meter) % song.meter < .01; events.push({time:seconds(position), midi, velocity:downbeat ? .9 : .74}); }
    position += beats;
  }
  position = 0;
  for (const [root, beats] of song.bass) {
    if (root !== null) for (const [midi, step, index] of arpeggio(root, beats)) { events.push({time:seconds(position), midi, velocity:index ? .26 : .36}); position += step; }
    else position += beats;
  }
  events.sort((a, b) => a.time - b.time);
  return {events, length:seconds(total) + song.beat * 1.5};
}
function setupAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioContext.createGain(); masterGain.gain.value = .8;
  const limiter = audioContext.createDynamicsCompressor(); limiter.threshold.value = -14; limiter.ratio.value = 4; limiter.attack.value = .004; limiter.release.value = .25;
  masterGain.connect(limiter); limiter.connect(audioContext.destination);
  // a warm little room: decaying noise, smoothed so the tail is soft rather than hissy
  room = audioContext.createConvolver();
  const length = Math.floor(audioContext.sampleRate * 2.6);
  const impulse = audioContext.createBuffer(2, length, audioContext.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel); let smooth = 0;
    for (let i = 0; i < length; i++) { smooth = smooth * .62 + (Math.random() * 2 - 1) * .38; data[i] = smooth * Math.pow(1 - i / length, 2.6); }
  }
  room.buffer = impulse; roomGain = audioContext.createGain(); roomGain.gain.value = .3; room.connect(roomGain); roomGain.connect(masterGain);
  const tone = audioContext.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 7200; tone.Q.value = .4;
  musicOut = audioContext.createGain(); musicOut.gain.value = .9; musicOut.connect(tone); tone.connect(masterGain); musicOut.connect(room);
  tickBuffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * .03), audioContext.sampleRate);
  const tick = tickBuffer.getChannelData(0); for (let i = 0; i < tick.length; i++) tick[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / tick.length, 4);
}
function track(node) { activeVoices.add(node); node.onended = () => { activeVoices.delete(node); node.disconnect(); }; }
// One plucked tine: a bright tick, a shimmering fundamental, and quick metallic overtones.
function pluck(midi, time, velocity, destination) {
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  const ring = Math.max(1.3, Math.min(3.4, 3.4 - (midi - 55) * .055));
  const voice = audioContext.createGain();
  voice.gain.setValueAtTime(0, time); voice.gain.linearRampToValueAtTime(velocity * .11, time + .004); voice.gain.exponentialRampToValueAtTime(.0001, time + ring);
  const pan = audioContext.createStereoPanner ? audioContext.createStereoPanner() : null;
  if (pan) { pan.pan.value = Math.max(-.45, Math.min(.45, (midi - 74) / 26)); voice.connect(pan); pan.connect(destination); } else voice.connect(destination);
  const partials = [[1, -3, 1, 1], [1, 4, .55, 1], [2, 0, .16, .45], [5.4, 0, .045, .09]];
  for (const [ratio, cents, level, life] of partials) {
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency * ratio; oscillator.detune.value = cents;
    gain.gain.setValueAtTime(level, time); gain.gain.exponentialRampToValueAtTime(.0001, time + ring * life);
    oscillator.connect(gain); gain.connect(voice); oscillator.start(time); oscillator.stop(time + ring + .05); track(oscillator);
  }
  const tick = audioContext.createBufferSource(), band = audioContext.createBiquadFilter(), tickGain = audioContext.createGain();
  tick.buffer = tickBuffer; band.type = 'bandpass'; band.frequency.value = Math.min(9000, frequency * 6); band.Q.value = 1.2;
  tickGain.gain.value = velocity * .045; tick.connect(band); band.connect(tickGain); tickGain.connect(voice); tick.start(time); track(tick);
}
// Little sound effects elsewhere on the page use the same music-box voice.
function chime(midi, time = audioContext?.currentTime, strength = .075) {
  if (!audioContext || time === undefined) return;
  pluck(midi, time, Math.min(1, strength * 12), musicOut);
}
function stopVoices() { for (const voice of activeVoices) { try { voice.stop(); } catch {} } }
function newBus() {
  songBus = audioContext.createGain(); songBus.gain.value = 1; songBus.connect(musicOut);
  return songBus;
}
function fadeBus(bus, seconds = .35) {
  if (!bus) return;
  const now = audioContext.currentTime;
  bus.gain.cancelScheduledValues(now); bus.gain.setValueAtTime(bus.gain.value, now); bus.gain.linearRampToValueAtTime(0, now + seconds);
  setTimeout(() => bus.disconnect(), seconds * 1000 + 3600);
}
function startSong(index, when) {
  songIndex = (index + lullabies.length) % lullabies.length;
  const built = buildSong(lullabies[songIndex]);
  songEvents = built.events; songLength = built.length; eventIndex = 0; songStart = when;
  renderPlayer();
}
function scheduleMelody() {
  if (!soundOn) return;
  // background tabs tick slowly, so look further ahead there to keep the music seamless
  const horizon = audioContext.currentTime + (document.hidden ? 2.5 : .3);
  while (true) {
    if (eventIndex >= songEvents.length) {
      if (songStart + songLength + songGap > horizon) break;
      startSong(songIndex + 1, songStart + songLength + songGap); continue;
    }
    const event = songEvents[eventIndex], time = songStart + event.time;
    if (time > horizon) break;
    pluck(event.midi, time + (Math.random() - .5) * .012, event.velocity * (.94 + Math.random() * .12), songBus);
    eventIndex++;
  }
  updateProgress();
}
function updateProgress() {
  const bar = document.querySelector('#mp-bar'); if (!bar) return;
  const amount = soundOn && audioContext ? Math.max(0, Math.min(1, (audioContext.currentTime - songStart) / songLength)) : 0;
  bar.style.transform = 'scaleX(' + amount.toFixed(3) + ')';
}
function renderPlayer() {
  const song = lullabies[songIndex];
  document.querySelector('#mp-title').textContent = song.title;
  document.querySelector('#mp-number').textContent = String(songIndex + 1).padStart(2, '0') + ' / ' + String(lullabies.length).padStart(2, '0');
  document.querySelectorAll('[data-song]').forEach(button => { if (Number(button.dataset.song) === songIndex) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current'); });
  document.querySelector('#scene-settings').classList.toggle('is-playing', soundOn);
}
function renderSound(unavailable = false) {
  const button = document.querySelector('#sound'); button.setAttribute('aria-pressed', String(soundOn));
  button.innerHTML = '<i data-lucide="' + (soundOn ? 'volume-2' : 'volume-x') + '"></i><span>' + (unavailable ? 'Audio unavailable' : soundOn ? 'Pause lullabies' : 'Play lullabies') + '</span>';
  button.title = soundOn ? 'Pause lullabies' : 'Play music-box lullabies';
  const player = document.querySelector('#lullaby-toggle'); player.setAttribute('aria-pressed', String(soundOn));
  player.setAttribute('aria-label', soundOn ? 'Pause' : 'Play');
  player.innerHTML = '<i data-lucide="' + (soundOn ? 'pause' : 'play') + '"></i>';
  renderPlayer(); updateProgress(); refreshIcons();
}
async function setSound(enabled, index = songIndex) {
  const request = ++audioRequest; clearInterval(musicTimer);
  if (enabled) {
    try {
      if (!audioContext) setupAudio(); await audioContext.resume(); if (request !== audioRequest) return;
      fadeBus(songBus); newBus(); soundOn = true;
      startSong(index, audioContext.currentTime + .08); scheduleMelody(); musicTimer = setInterval(scheduleMelody, 90);
    } catch { soundOn = false; renderSound(true); return; }
  } else if (soundOn) {
    soundOn = false; fadeBus(songBus, .45);
    setTimeout(() => { if (!soundOn) stopVoices(); }, 600);
  }
  renderSound();
}
for (const id of ['sound', 'lullaby-toggle']) document.getElementById(id).addEventListener('click', () => setSound(!soundOn));
function changeSong(index) { if (soundOn) setSound(true, index); else { songIndex = (index + lullabies.length) % lullabies.length; renderPlayer(); } }
document.querySelector('#mp-next').addEventListener('click', () => changeSong(songIndex + 1));
document.querySelector('#mp-prev').addEventListener('click', () => {
  const elapsed = soundOn ? audioContext.currentTime - songStart : 0;
  changeSong(elapsed > 4 ? songIndex : songIndex - 1);
});
document.querySelector('#mp-list').innerHTML = lullabies.map((song, index) => `<li><button type="button" data-song="${index}"><span>${String(index + 1).padStart(2, '0')}</span>${song.title}</button></li>`).join('');
document.querySelectorAll('[data-song]').forEach(button => button.addEventListener('click', () => { const index = Number(button.dataset.song); if (soundOn && index === songIndex) return; setSound(true, index); }));
renderPlayer();
document.addEventListener('visibilitychange',()=> {if(document.hidden) setSound(false);});
window.addEventListener('pagehide',()=> { clearInterval(musicTimer); stopVoices(); audioContext?.close(); },{once:true});



// Reveal story chapters as they enter view; keep content visible when motion is reduced.
const revealElements = document.querySelectorAll('.reveal, .world-copy > :not(.world-sky), .story-night-layout > *, .board-heading > *, .wish-board-layout > *, .footer-quiet > *');
let revealObserver;
function setupScrollReveals() {
  if (revealObserver) revealObserver.disconnect();
  document.body.classList.toggle('motion-ready', !reducedMotion.matches && 'IntersectionObserver' in window);
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealElements.forEach(element => element.classList.add('visible'));
    return;
  }
  revealElements.forEach((element, index) => {
    if (!element.classList.contains('reveal')) element.classList.add('scroll-reveal');
    element.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 90}ms`);
  });
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
    });
  }, { threshold: .1, rootMargin: '0px 0px -45px 0px' });
  revealElements.forEach(element => revealObserver.observe(element));
}
setupScrollReveals();
reducedMotion.addEventListener('change', setupScrollReveals);
let scrollScheduled = false;
function updateScrollStory() {
  scrollScheduled = false;
  const range = document.documentElement.scrollHeight - window.innerHeight;
  const progress = range > 0 ? window.scrollY / range : 0;
  document.querySelector('#reading-progress').style.transform = 'scaleX(' + Math.min(1, Math.max(0, progress)) + ')';
  if (!reducedMotion.matches) {
    document.querySelector('#dreamscape').style.setProperty('--parallax', Math.min(window.scrollY * .022, 15) + 'px');
    document.querySelector('#home').style.setProperty('--world-scroll', Math.min(window.scrollY*.035,26)+'px');
    document.querySelector('#story-night-world')?.style.setProperty('--story-drift', `${Math.min(window.scrollY * .012, 18)}px`);
  }
  const sections = ['story','celebration','wishes'];
  let current = '';
  for (const id of sections) if (document.getElementById(id).getBoundingClientRect().top <= window.innerHeight * .4) current = id;
  document.querySelectorAll('nav [data-section]').forEach(link => { if (link.dataset.section === current) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
}
window.addEventListener('scroll', () => { if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(updateScrollStory); } }, { passive:true });
window.addEventListener('resize', updateScrollStory);
updateScrollStory();

const photos = ["/assets/memory-1.webp","/assets/memory-2.webp","/assets/memory-3.webp","/assets/memory-4.webp","/assets/memory-5.webp","/assets/memory-6.webp","/assets/memory-7.webp"];
const photoCaptions = ["Our little sunshine","A little bouquet of wonder","The sweetest little smile","Jordy & Julia, side by side","Ate Jordy, sharing the magic","A kiss for the next chapter","One year of beautiful little moments"];
const photoAlts = ["Julia sitting in her pink dress among flowers","Julia holding a flower pot in her lavender dress","Julia smiling in her lavender dress","Big sister Jordy Olivia hugging Julia from behind, Julia in her lavender dress","Julia in pink sitting beside her sister Jordy Olivia and a soft toy","Julia wearing a crown and making a kiss face","Julia smiling among flowers in her lavender dress"];
const dialog = document.querySelector('#photo-dialog');
let photoIndex = 0;
function showPhoto(index) {
  photoIndex = (index + photos.length) % photos.length;
  const image=document.querySelector('#large-photo'); image.src=photos[photoIndex]; image.alt=photoAlts[photoIndex];
  document.querySelector('#photo-count').textContent=`${photoIndex+1} / ${photos.length}`;
  document.querySelector('#photo-caption').textContent=photoCaptions[photoIndex];
  document.querySelectorAll('.gallery-thumb').forEach((thumb,i)=>thumb.setAttribute('aria-pressed',String(i===photoIndex)));
}
photos.forEach((src,i)=> {const thumb=document.createElement('button');thumb.className='gallery-thumb';thumb.setAttribute('aria-label','View photo '+(i+1)+': '+photoCaptions[i]);thumb.setAttribute('aria-pressed','false');const image=document.createElement('img');image.src=src;image.alt='';image.loading='lazy';thumb.append(image);thumb.addEventListener('click',()=>showPhoto(i));document.querySelector('#gallery-thumbs').append(thumb);});
let swipeStart;
document.querySelector('#large-photo').addEventListener('pointerdown',event=>{swipeStart=event.clientX;event.currentTarget.setPointerCapture(event.pointerId);});
document.querySelector('#large-photo').addEventListener('pointerup',event=>{if(swipeStart!==undefined&&Math.abs(event.clientX-swipeStart)>45)showPhoto(photoIndex+(event.clientX<swipeStart?1:-1));swipeStart=undefined;});
document.querySelector('#large-photo').addEventListener('pointercancel',()=>{swipeStart=undefined;});
document.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => { showPhoto(Number(button.dataset.photo)); dialog.showModal(); }));
document.querySelector('#close-photo').addEventListener('click', () => dialog.close());
document.querySelector('#previous-photo').addEventListener('click', () => showPhoto(photoIndex - 1));
document.querySelector('#next-photo').addEventListener('click', () => showPhoto(photoIndex + 1));
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
dialog.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') showPhoto(photoIndex - 1); if (event.key === 'ArrowRight') showPhoto(photoIndex + 1); });

// The calendar file is static (public/julia-first-birthday.ics) so it opens in Safari, Chrome and most in-app browsers.
document.querySelector('#calendar').addEventListener('click', () => {
  const link = document.createElement('a'); link.href = '/julia-first-birthday.ics'; link.download = 'julia-first-birthday.ics'; link.click();
});
function celebrate() {
  if (reducedMotion.matches) return;
  const container = document.querySelector('#confetti');
  for (let i = 0; i < 65; i++) {
    const piece = document.createElement('span'); piece.className = 'confetti-piece';
    piece.style.left = (Math.random() * 100) + '%';
    piece.style.background = ['#e6b755','#b5c6a0','#eda58b','#9ebed1'][i % 4];
    piece.style.animationDelay = (Math.random() * .7) + 's';
    piece.style.setProperty('--drift', ((Math.random() - .5) * 240) + 'px'); container.append(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}
// Small interactions throughout the world have keyboard equivalents.
function stardust(element, symbol='♡') {
  const rect=element.getBoundingClientRect();
  const x=rect.left+rect.width/2, y=rect.top+rect.height/2;
  document.querySelector('#magic-message').textContent=symbol==='♡'?'A little love for Julia.':'A little dream, sent into the stars.';
  if(reducedMotion.matches) return;
  const container=document.querySelector('#stardust');
  for(let i=0;i<15;i++) { const p=document.createElement('span');p.className='magic-particle';p.textContent=symbol;p.style.left=x+'px';p.style.top=y+'px';p.style.setProperty('--magic-x',((Math.random()-.5)*170)+'px');p.style.setProperty('--magic-y',(-45-Math.random()*140)+'px');p.style.setProperty('--magic-r',((Math.random()-.5)*160)+'deg');p.style.fontSize=(12+Math.random()*14)+'px';container.append(p);setTimeout(()=>p.remove(),1800); }
}
document.querySelectorAll('.star-button').forEach(button=>button.addEventListener('click',()=>{stardust(button);if(soundOn)chime(84);}));
const hello=document.querySelector('#julia-hello');let helloTimer;
hello.addEventListener('click',()=>{stardust(hello.querySelector('img'),'♡');const world=document.querySelector('#dreamscape');world.classList.remove('waving');requestAnimationFrame(()=>world.classList.add('waving'));clearTimeout(helloTimer);helloTimer=setTimeout(()=>world.classList.remove('waving'),1300);});
const balloon=document.querySelector('#balloon');let balloonTimer;
balloon.addEventListener('click',()=>{stardust(balloon);balloon.classList.remove('launched');requestAnimationFrame(()=>balloon.classList.add('launched'));clearTimeout(balloonTimer);balloonTimer=setTimeout(()=>balloon.classList.remove('launched'),3600);});
const finePointer=window.matchMedia('(pointer:fine)');
document.querySelectorAll('.photo-card').forEach(card=>{
  card.addEventListener('pointermove',event=>{if(reducedMotion.matches||!finePointer.matches)return;const r=card.getBoundingClientRect(),x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;card.style.setProperty('--tilt-x',((.5-y)*5)+'deg');card.style.setProperty('--tilt-y',((x-.5)*6)+'deg');card.style.setProperty('--shine-x',(x*100)+'%');card.style.setProperty('--shine-y',(y*100)+'%');});
  card.addEventListener('pointerleave',()=>{card.style.setProperty('--tilt-x','0deg');card.style.setProperty('--tilt-y','0deg');});
});
const chapterObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;document.querySelectorAll('.chapter-tabs a').forEach(link=>{if(link.hash==='#'+entry.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});});},{rootMargin:'-15% 0px -40% 0px',threshold:.1});
document.querySelectorAll('.story-scene').forEach(scene=>chapterObserver.observe(scene));

// Guests choose a portrait; generated poses load only when requested.
const characterPoses = {
  sunshine: {src:'/assets/julia-lavender.webp',alt:'Storybook Julia smiling in her lavender dress with satin bows',label:'Little Sunshine'},
  kisses: {src:'/assets/julia-crown-sunshine.webp',alt:'Storybook Julia in a pink birthday crown, sending a little kiss',label:'Birthday kisses'},
};
const characterCache = new Map();
let characterRequest = 0;
function loadCharacter(src) {
  if (!characterCache.has(src)) {
    const promise=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{characterCache.delete(src);reject(new Error('Portrait unavailable'));};image.src=src;});
    characterCache.set(src,promise);
  }
  return characterCache.get(src);
}
document.querySelectorAll('[data-character]').forEach(button=> {
  const pose=characterPoses[button.dataset.character];
  for(const event of ['pointerenter','focus']) button.addEventListener(event,()=>{loadCharacter(pose.src).catch(()=>{});},{once:true});
  button.addEventListener('click',async()=> {
    const request=++characterRequest;
    const image=document.querySelector('#julia-character');
    if(button.getAttribute('aria-pressed')==='true'){image.classList.remove('character-switching');return;}
    try {
      await loadCharacter(pose.src);if(request!==characterRequest)return;
      image.classList.add('character-switching');
      if(!reducedMotion.matches)await new Promise(resolve=>setTimeout(resolve,220));
      if(request!==characterRequest)return;
      image.src=pose.src;image.alt=pose.alt;
      document.querySelectorAll('[data-character]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
      requestAnimationFrame(()=>image.classList.remove('character-switching'));
      document.querySelector('#portrait-status').textContent=pose.label+' portrait selected.';
    } catch {if(request===characterRequest){image.classList.remove('character-switching');document.querySelector('#portrait-status').textContent='This portrait could not load. Please try again.';}}
  });
});
const sceneSettings=document.querySelector('#scene-settings');
document.addEventListener('pointerdown',event=>{if(sceneSettings.open&&!sceneSettings.contains(event.target))sceneSettings.open=false;});
sceneSettings.addEventListener('keydown',event=>{if(event.key==='Escape'){sceneSettings.open=false;sceneSettings.querySelector('summary').focus();}});


// Hero: a live party ticket.
function updateHeroCount() {
  const remaining = celebrationDate.getTime() - Date.now();
  const left = Math.max(0, remaining);
  const parts = {'hc-days':Math.floor(left/86400000),'hc-hours':Math.floor(left/3600000)%24,'hc-mins':Math.floor(left/60000)%60,'hc-secs':Math.floor(left/1000)%60};
  for (const [id,value] of Object.entries(parts)) document.getElementById(id).textContent = String(value).padStart(2,'0');
  if (remaining <= 0) { document.querySelector('#hero-count-label').textContent = remaining > -43200000 ? 'The party is happening now ♡' : 'Thank you for celebrating with us ♡'; clearInterval(heroCountTimer); }
}
const heroCountTimer = setInterval(updateHeroCount, 1000); updateHeroCount();
document.querySelector('#hero-save-date').addEventListener('click', () => document.querySelector('#calendar').click());

// Header: floating bar that condenses on scroll, a sliding section indicator, and a phone menu sheet.
const siteHeader = document.querySelector('#site-header');
const headerNav = document.querySelector('#header-nav');
const navIndicator = document.querySelector('.nav-indicator');
const menuButton = document.querySelector('#menu-button');
const headerDays = Math.floor((celebrationDate.getTime() - Date.now()) / 86400000);
document.querySelector('#header-days').textContent = headerDays > 1 ? headerDays + ' days' : headerDays === 1 ? '1 day' : 'Oct 25';
let headerFrame = 0;
function updateHeader() {
  headerFrame = 0;
  siteHeader.classList.toggle('is-scrolled', window.scrollY > 24);
  const current = headerNav.querySelector('a[aria-current]');
  navIndicator.style.opacity = current ? '1' : '0';
  if (current) { navIndicator.style.width = current.offsetWidth + 'px'; navIndicator.style.transform = 'translateX(' + current.offsetLeft + 'px)'; }
}
window.addEventListener('scroll', () => { if (!headerFrame) headerFrame = requestAnimationFrame(updateHeader); }, { passive:true });
window.addEventListener('resize', updateHeader); updateHeader();
function setMenu(open) {
  siteHeader.classList.toggle('menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
menuButton.addEventListener('click', () => setMenu(!siteHeader.classList.contains('menu-open')));
headerNav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && siteHeader.classList.contains('menu-open')) { setMenu(false); menuButton.focus(); } });
document.addEventListener('pointerdown', event => { if (siteHeader.classList.contains('menu-open') && !siteHeader.contains(event.target)) setMenu(false); });

// Depth: scene layers drift with the pointer like a little pop-up book.
const scene = document.querySelector('#dreamscape');
scene.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType !== 'mouse') return;
  const rect = scene.getBoundingClientRect();
  scene.style.setProperty('--px', ((event.clientX - rect.left) / rect.width - .5).toFixed(3));
  scene.style.setProperty('--py', ((event.clientY - rect.top) / rect.height - .5).toFixed(3));
});
scene.addEventListener('pointerleave', () => { scene.style.setProperty('--px','0'); scene.style.setProperty('--py','0'); });

document.addEventListener('birthday-star', event => {
  if (soundOn) chime(72 + event.detail.index * 2);
  if (event.detail.complete) celebrate();
});


