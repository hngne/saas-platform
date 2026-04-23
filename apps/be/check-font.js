const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, 'src', 'assets', 'fonts', 'Roboto-Regular.ttf');
const boldPath = path.join(__dirname, 'src', 'assets', 'fonts', 'Roboto-Bold.ttf');

console.log('Regular exists:', fs.existsSync(fontPath));
console.log('Bold exists:', fs.existsSync(boldPath));

if (fs.existsSync(fontPath)) {
  const buf = fs.readFileSync(fontPath);
  console.log('Regular size:', buf.length);
  console.log('First 4 bytes (hex):', buf.slice(0, 4).toString('hex'));
  console.log('First 20 chars as string:', buf.slice(0, 20).toString('utf8'));
  // Valid TTF starts with 00010000 or 'true' (74727565) for TrueType
  const sig = buf.slice(0, 4).toString('hex');
  console.log('Is valid TTF:', sig === '00010000' || sig === '74727565');
}
