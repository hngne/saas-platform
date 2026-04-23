const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, 'src', 'assets', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const files = [
  { url: 'https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Regular.ttf', name: 'Roboto-Regular.ttf' },
  { url: 'https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Bold.ttf', name: 'Roboto-Bold.ttf' }
];

files.forEach(file => {
  const dest = path.join(fontsDir, file.name);
  const fileStream = fs.createWriteStream(dest);
  
  https.get(file.url, response => {
    // Handle redirects
    if (response.statusCode === 301 || response.statusCode === 302) {
      https.get(response.headers.location, redirectResponse => {
        redirectResponse.pipe(fileStream);
      });
    } else {
      response.pipe(fileStream);
    }
  });
});

console.log('Downloading fonts...');
