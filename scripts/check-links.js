const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));
const missing = [];

for (const file of files) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  for (const ref of refs) {
    if (!ref || ref.startsWith('#') || /^(https?:|mailto:|tel:|data:)/.test(ref)) continue;
    const clean = ref.split('#')[0].split('?')[0];
    if (!clean) continue;
    const target = path.join(root, clean);
    if (!fs.existsSync(target)) missing.push(file + ' -> ' + ref);
  }
}

if (missing.length) {
  console.error('Broken local references:\n' + missing.join('\n'));
  process.exit(1);
}
console.log('Local link check passed for ' + files.length + ' HTML files.');
