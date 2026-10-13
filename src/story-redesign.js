const storyNight = document.querySelector('#story-night-world');
if (storyNight) {
  const progress = document.querySelector('#star-progress');
  const status = document.querySelector('#constellation-status');
  const action = document.querySelector('#light-sky');
  const portrait = document.querySelector('#story-portrait');
  if (portrait) {
    portrait.src = '/assets/story-lavender-3d.webp';
    portrait.alt = '3D storybook Julia smiling in her lavender dress';
  }
  if (progress) progress.textContent = '';
  if (action) { action.textContent = ''; action.setAttribute('aria-label', 'Light a birthday star'); }
  document.querySelectorAll('[data-wish-star]').forEach((star, index) => {
    star.setAttribute('aria-label', `Send birthday wish from star ${index + 1}`);
    star.setAttribute('aria-pressed', 'true');
    star.addEventListener('click', () => {
      if (status) status.textContent = ['A little joy, for every new day.','A little wonder, for every adventure.','A little love, wherever she goes.','A little courage, as her world grows.','A little laughter, always.','A whole sky of love for Julia.'][index];
    });
  });
}
