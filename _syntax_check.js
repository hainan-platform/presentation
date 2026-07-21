const fs = require('fs');
const re = require('path');

// Read index.html
const html = fs.readFileSync('index.html', 'utf-8');

// Extract JS
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) {
  console.log('No script tag found');
  process.exit(1);
}

const js = match[1];
console.log('JS length:', js.length);

// Write JS to temp file
fs.writeFileSync('_check.js', js);

// Check syntax
try {
  new Function(js);
  console.log('SYNTAX OK - no errors detected');
} catch (e) {
  console.log('SYNTAX ERROR:', e.message);
  // Find the line
  const lines = js.split('\n');
  if (e.lineNumber) {
    console.log('Near line', e.lineNumber);
    for (let i = Math.max(0, e.lineNumber - 3); i < Math.min(lines.length, e.lineNumber + 2); i++) {
      console.log((i+1) + ': ' + lines[i]);
    }
  }
}
