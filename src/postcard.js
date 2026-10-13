const dialog = document.querySelector('#postcard-dialog');
const opener = document.querySelector('#open-postcard');
const name = document.querySelector('#postcard-name');
const wish = document.querySelector('#postcard-wish');
const note = document.querySelector('#postcard-note');
const save = document.querySelector('.postcard-save');
function updatePreview() {
  document.querySelector('#postcard-preview-wish').textContent = wish.value;
  document.querySelector('#postcard-preview-name').textContent = name.value.trim() ? 'With love, ' + name.value.trim() : 'With love, always.';
  note.textContent = 'Your words stay on this device.';
}
opener?.addEventListener('click', () => { updatePreview(); dialog.showModal(); });
document.querySelector('#close-postcard').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const r = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
});
for (const input of [name, wish]) input.addEventListener('input', updatePreview);
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
  });
}
function textLines(context, text, width) {
  const lines = []; let line = '';
  for (const word of text.split(/\s+/)) {
    if (context.measureText(word).width > width) {
      if (line) { lines.push(line); line = ''; }
      for (const char of word) {
        if (context.measureText(line + char).width > width) { lines.push(line); line = ''; }
        line += char;
      }
    } else if (line && context.measureText(line + ' ' + word).width > width) {
      lines.push(line); line = word;
    } else { line += (line ? ' ' : '') + word; }
  }
  if (line) lines.push(line);
  return lines;
}
function wrapText(context, text, x, y, width, lineHeight) {
  for (const line of textLines(context, text, width)) { context.fillText(line, x, y); y += lineHeight; }
  return y;
}
document.querySelector('#postcard-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!wish.value.trim()) { wish.setCustomValidity('Write a little birthday wish first.'); wish.reportValidity(); wish.setCustomValidity(''); return; }
  save.disabled = true; note.textContent = 'Making your postcard…';
  try {
    const [background, portrait] = await Promise.all([loadImage('/assets/cloud-garden-v2.webp'), loadImage('/assets/julia-lavender.webp'), document.fonts.ready]);
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 800;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, 1200, 800);
    ctx.save(); ctx.beginPath(); ctx.rect(660, 0, 540, 800); ctx.clip();
    ctx.drawImage(background, 350, 0, 1200, 800);
    ctx.drawImage(portrait, 695, 300, 470, 470); ctx.restore();
    ctx.strokeStyle = '#b9c8af'; ctx.lineWidth = 2; ctx.strokeRect(25, 25, 1150, 750);
    ctx.fillStyle = '#526647'; ctx.font = '600 18px Manrope, sans-serif'; ctx.fillText('HAPPY FIRST BIRTHDAY', 70, 115);
    ctx.fillStyle = '#344d35'; ctx.font = '500 67px Fraunces, Georgia, serif'; ctx.fillText('Julia Elisha', 70, 225);
    ctx.fillStyle = '#965739'; ctx.font = 'italic 30px Fraunces, Georgia, serif'; ctx.fillText('One year. Endless love.', 70, 280);
    ctx.fillStyle = '#4d5d46';
    let size = 27;
    do { ctx.font = '400 ' + size + 'px Manrope, sans-serif'; if (textLines(ctx, wish.value.trim(), 515).length * size * 1.5 <= 210) break; size--; } while (size > 16);
    const end = wrapText(ctx, wish.value.trim(), 70, 365, 515, size * 1.5);
    ctx.fillStyle = '#344d35'; ctx.font = 'italic 25px Fraunces, Georgia, serif';
    wrapText(ctx, name.value.trim() ? 'With love, ' + name.value.trim() : 'With love, always.', 70, Math.max(605, end + 25), 515, 32);
    ctx.fillStyle = '#526647'; ctx.font = '500 17px Manrope, sans-serif'; ctx.fillText('OCTOBER 25, 2026', 70, 720);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Unable to export');
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'julia-first-birthday-postcard.png'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    note.textContent = 'Your postcard is ready. Thank you for a little birthday love!';
  } catch { note.textContent = 'We couldn’t make the postcard. Please try again.'; }
  finally { save.disabled = false; }
});
