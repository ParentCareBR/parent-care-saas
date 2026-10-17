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

// 1. Gather all actual app pages
const appDir = path.join(__dirname, '../src/app');
const allAppFiles = getFiles(appDir);
const pageFiles = allAppFiles.filter(f => f.endsWith('page.tsx'));
const routeFiles = allAppFiles.filter(f => f.endsWith('route.ts'));

console.log('=== APP PAGES (' + pageFiles.length + ') ===');
const existingRoutes = pageFiles.map(f => {
  let rel = path.relative(appDir, f).replace(/\\/g, '/').replace(/\/page\.tsx$/, '');
  rel = '/' + rel;
  return rel;
});
console.log(existingRoutes);

console.log('\n=== API ROUTES (' + routeFiles.length + ') ===');
const apiRoutes = routeFiles.map(f => {
  let rel = path.relative(appDir, f).replace(/\\/g, '/').replace(/\/route\.ts$/, '');
  return '/' + rel;
});
console.log(apiRoutes);

// 2. Scan for all hrefs in src
const allSrcFiles = getFiles(path.join(__dirname, '../src'));
const brokenLinks = [];
const allHrefs = [];

allSrcFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  // Match href="/..." or href={`/...`}
  const lines = content.split('\n');
  lines.forEach((line, lineNo) => {
    const matches = line.matchAll(/href=["'`](\/[^"'`#?]+)/g);
    for (const match of matches) {
      const rawHref = match[1];
      // Normalize ${locale} or [locale]
      let normalized = rawHref
        .replace(/\$\{[^}]+\}/g, '[locale]')
        .replace(/\/pt-BR\b/, '/[locale]')
        .replace(/\/en\b/, '/[locale]');
      
      allHrefs.push({ file: path.relative(path.join(__dirname, '..'), f), line: lineNo + 1, href: rawHref, normalized });
    }
  });
});

console.log('\n=== CHECKING TOTAL DETECTED HREFS (' + allHrefs.length + ') ===');

allHrefs.forEach(item => {
  // Check if normalized matches any existing route or pattern
  let norm = item.normalized;
  if (norm.endsWith('/')) norm = norm.slice(0, -1);
  if (!norm) norm = '/';

  // Test against existingRoutes
  const matches = existingRoutes.some(er => {
    // Exact match
    if (er === norm) return true;
    if (er === norm + '/page') return true;
    // Dynamic segments
    const erParts = er.split('/');
    const normParts = norm.split('/');
    if (erParts.length !== normParts.length) return false;
    return erParts.every((part, idx) => {
      if (part.startsWith('[') && part.endsWith(']')) return true;
      if (normParts[idx].startsWith('[') && normParts[idx].endsWith(']')) return true;
      return part === normParts[idx];
    });
  });

  // Check if it's external or api or anchor
  if (!matches && !norm.startsWith('/api') && !norm.startsWith('/_') && norm !== '#') {
    brokenLinks.push(item);
  }
});

console.log('\n=== POTENTIAL BROKEN LINKS (' + brokenLinks.length + ') ===');
brokenLinks.forEach(b => console.log(`${b.file}:${b.line} -> ${b.href} (norm: ${b.normalized})`));
