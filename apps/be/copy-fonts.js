const fs = require('fs');
const path = require('path');

const src1 = 'C:\\Windows\\Fonts\\arial.ttf';
const src2 = 'C:\\Windows\\Fonts\\arialbd.ttf';
const destDir = path.join(__dirname, 'src', 'assets', 'fonts');

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

try {
  fs.copyFileSync(src1, path.join(destDir, 'Arial-Regular.ttf'));
  console.log('Copied Arial Regular');
} catch(e) { console.error('Failed regular:', e.message); }

try {
  fs.copyFileSync(src2, path.join(destDir, 'Arial-Bold.ttf'));
  console.log('Copied Arial Bold');
} catch(e) { console.error('Failed bold:', e.message); }

// Verify
const r = path.join(destDir, 'Arial-Regular.ttf');
const b = path.join(destDir, 'Arial-Bold.ttf');
if (fs.existsSync(r)) {
  const buf = fs.readFileSync(r);
  console.log('Arial Regular size:', buf.length, 'bytes');
  console.log('First 4 bytes:', buf.slice(0,4).toString('hex'));
}
if (fs.existsSync(b)) {
  const buf = fs.readFileSync(b);
  console.log('Arial Bold size:', buf.length, 'bytes');
}
console.log('DONE');
