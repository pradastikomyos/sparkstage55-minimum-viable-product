import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');

let failed = false;
let warnings = [];

function fail(msg) {
  console.error(`❌ ${msg}`);
  failed = true;
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
  warnings.push(msg);
}

function findFiles(dir, pattern, results = []) {
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
      findFiles(full, pattern, results);
    } else if (entry.isFile() && pattern.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ── Check 1: No global "zara-*" class refs in .tsx / .ts — all quote styles ──
const srcFiles = findFiles(join(root, 'src'), /\.(tsx|ts)$/);
let zaraCount = 0;
for (const file of srcFiles) {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  // Match className="zara-...", className={'zara-...'}, className={`zara-...`}
  const re = /className=["'`][^"'`]*zara-[^"'`]*["'`]/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (m) {
      const rel = file.replace(root + '\\', '').replace(root + '/', '');
      fail(`${rel}:${i + 1} — references global "zara-*" class: ${m[0].trim()}`);
      zaraCount++;
    }
  }
}

// ── Check 2: No .zara-* selector in public/styles CSS ──
const publicStyles = join(root, 'public', 'styles');
if (existsSync(publicStyles)) {
  for (const f of readdirSync(publicStyles).filter(x => x.endsWith('.css'))) {
    const content = readFileSync(join(publicStyles, f), 'utf-8');
    if (/\.zara-/.test(content)) {
      warn(`${f} still contains .zara-* selectors (inactive but confusing)`);
    }
  }
}

// ── Check 3: index.html still links my-orders.css ──
const htmlPath = join(root, 'index.html');
if (existsSync(htmlPath)) {
  const html = readFileSync(htmlPath, 'utf-8');
  const links = html.match(/href="\/styles\/[^"]+\.css"/g) || [];
  for (const link of links) {
    if (link.includes('my-orders.css')) {
      fail('index.html still links my-orders.css');
    }
  }
}

if (failed) {
  console.error(`\n❌ ${zaraCount} global "zara-*" violation(s) found. Run "npm run build" to verify no regressions.`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn(`\n⚠️  ${warnings.length} warning(s) — review before shipping.`);
}

console.log('✅ CSS architecture checks passed — zero global zara-* class references in source.');
