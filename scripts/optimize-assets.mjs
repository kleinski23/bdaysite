import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const assets = [
  ['cloud-cradle.png', 1200, 85],
  ['story-balloon.png', 480, 85],
  ['storybook.png', 840, 86],
  ['birthday-gifts.png', 400, 86],
  ['birthday-cake.png', 640, 88],
  ['bedtime-world.png', 1800, 86],
  ['birthday-one.png', 420, 87],
  ['julia-lavender.png', 720, 88],
  ['julia-crown.png', 720, 88],
  ['sunshine-garden.png', 1800, 86],
  ['sunshine-cloud-garden.png', 1000, 86],
  ['julia-flowers.png', 720, 88],
  ['julia-crown-sunshine.png', 720, 88],
  ['story-lavender-3d.png', 720, 88],
  ['story-garden-3d.png', 720, 88],
  ['story-pink-3d.png', 720, 88],
  ['photo-1.jpg', 1600, 85],
  ['photo-2.jpg', 1600, 85],
  ['photo-3.jpg', 1600, 85],
];

for (const [name, width, quality] of assets) {
  const input = new URL(`../assets-src/${name}`, import.meta.url);
  const output = new URL(`../public/assets/${name.replace(/\.(png|jpg)$/, '.webp')}`, import.meta.url);
  // Preserve transparency; original generated assets and photos remain intact.
  await sharp(fileURLToPath(input))
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, alphaQuality: 100 })
    .toFile(fileURLToPath(output));
  const original = await stat(input);
  const optimized = await stat(output);
  console.log(`${name}: ${Math.round(original.size / 1024)} KB → ${Math.round(optimized.size / 1024)} KB`);
}

// The keepsake album uses every supplied photo, in curated reading order.
const memories = ['5809', '5416', '5669', '5619', '5785', '5726', '5670'];
for (const [index, name] of memories.entries()) {
  const input = fileURLToPath(new URL(`../assets-src/photos/DSC_${name}.jpg`, import.meta.url));
  const output = fileURLToPath(new URL(`../public/assets/memory-${index + 1}.webp`, import.meta.url));
  await sharp(input).rotate().resize({ width: 1500, withoutEnlargement: true }).webp({ quality: 85 }).toFile(output);
  console.log(`Memory ${index + 1}: ${Math.round((await stat(output)).size / 1024)} KB`);
}
