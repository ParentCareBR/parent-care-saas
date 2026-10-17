const fs = require('fs');
const path = require('path');

function getFiles(dir, exts = ['.tsx', '.ts']) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.next')) {
          results = results.concat(getFiles(file, exts));
        }
      } else {
        if (exts.some(ext => file.endsWith(ext))) results.push(file);
      }
    });
  } catch (e) {}
  return results;
}

const appDir = path.join(__dirname, '../src/app');
const allAppFiles = getFiles(appDir);
const pageFiles = allAppFiles.filter(f => f.endsWith('page.tsx'));

const existingRoutes = pageFiles.map(f => {
  let rel = path.relative(appDir, f)
    .replace(/\\/g, '/')
    .replace(/\/page\.tsx$/, '')
    .replace(/\/\([^)]+\)/g, ''); // remove route groups like (dashboard)
  rel = '/' + rel;
  return rel;
});

const allSrcFiles = getFiles(path.join(__dirname, '../src'));
const broken = [];
let totalHrefs = 0;

allSrcFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  // Match href={...} or href="..."
  const regex = /href=\{?`?(['"][^'"]+['"]|`[^`]+`)`?\}?/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    let raw = match[1];
    if (raw.startsWith('"') || raw.startsWith("'") || raw.startsWith('`')) {
      raw = raw.slice(1, -1);
    }
    if (!raw.startsWith('/') && !raw.startsWith('${')) continue;
    totalHrefs++;

    // Normalize
    let norm = raw
      .replace(/\$\{locale\}/g, '[locale]')
      .replace(/\$\{[^}]+\}/g, '[dynamic]')
      .replace(/\/pt-BR\b/, '/[locale]')
      .replace(/\/en\b/, '/[locale]')
      .split('?')[0]
      .split('#')[0];

    if (norm.endsWith('/') && norm.length > 1) norm = norm.slice(0, -1);

    const matches = existingRoutes.some(er => {
      if (er === norm) return true;
      const erParts = er.split('/');
      const normParts = norm.split('/');
      if (erParts.length !== normParts.length) return false;
      return erParts.every((p, i) => {
        if (p.startsWith('[') && p.endsWith(']')) return true;
        if (normParts[i].startsWith('[') && normParts[i].endsWith(']')) return true;
        return p === normParts[i];
      });
    });

    if (!matches && !norm.startsWith('/api') && !norm.startsWith('/#')) {
      broken.push({ file: path.relative(path.join(__dirname, '..'), f), raw, norm });
    }
  }
});

console.log('Total verified internal hrefs:', totalHrefs);
console.log('Real broken links:', broken.length);
broken.forEach(b => console.log(`${b.file} -> ${b.raw} (norm: ${b.norm})`));
