// public/favicon.svg dosyasından masaüstü uygulama ikonlarını üretir: node scripts/make-icons.cjs
const sharp = require('sharp');
const path = require('node:path');

const root = path.join(__dirname, '..');
const svg = path.join(root, 'public', 'favicon.svg');

(async () => {
  await sharp(svg, { density: 1024 }).resize(512, 512).png().toFile(path.join(root, 'build', 'icon.png'));
  console.log('İkonlar build/ klasörüne yazıldı.');
})();
