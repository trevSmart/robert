const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, 'Inter-Variable.woff2');
const buffer = fs.readFileSync(fontPath);
const base64 = buffer.toString('base64');
const dataUrl = `data:font/woff2;base64,${base64}`;

console.log(dataUrl);
