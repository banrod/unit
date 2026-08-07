import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const requiredFiles = [
  'index.html',
  'app.js',
  'styles.css',
  'package.json',
  'content/site-copy.json',
  'content/visitor-paths.json',
  'content/teaching-cards.json',
  'content/principles.json',
  'content/theology.json',
  'content/glossary.json',
  'content/forbidden-claims.json'
];

const failures = [];
const pass = (name) => console.log(`PASS ${name}`);
const fail = (name, detail) => {
  failures.push(`${name}: ${detail}`);
  console.error(`FAIL ${name}: ${detail}`);
};

for (const file of requiredFiles) {
  try {
    await access(resolve(root, file));
    pass(`required:${file}`);
  } catch {
    fail(`required:${file}`, 'missing');
  }
}

async function json(name) {
  try {
    return JSON.parse(await readFile(resolve(root, name), 'utf8'));
  } catch (error) {
    fail(`json:${name}`, error.message);
    return {};
  }
}

const [siteCopy, paths, cards, principles, theology, glossary, forbidden] = await Promise.all([
  json('content/site-copy.json'),
  json('content/visitor-paths.json'),
  json('content/teaching-cards.json'),
  json('content/principles.json'),
  json('content/theology.json'),
  json('content/glossary.json'),
  json('content/forbidden-claims.json')
]);

if (siteCopy.hero?.title && siteCopy.orientation?.body && siteCopy.nature?.body && siteCopy.stewardship?.body && siteCopy.sourceNote) {
  pass('shape:site-copy');
} else {
  fail('shape:site-copy', 'hero/orientation/nature/stewardship/sourceNote required');
}

if (Array.isArray(paths.paths) && paths.paths.length >= 2 && paths.paths.every((path) => Array.isArray(path.steps) && path.steps.length >= 5)) {
  pass('shape:visitor-paths');
} else {
  fail('shape:visitor-paths', 'at least two five-stage paths required');
}

if (Array.isArray(cards.cards) && cards.cards.length > 0) pass('shape:teaching-cards');
else fail('shape:teaching-cards', 'cards[] required');

if (Array.isArray(principles.principles) && principles.principles.length > 0) pass('shape:principles');
else fail('shape:principles', 'principles[] required');

if (theology.definition || theology.boundary || Array.isArray(theology.metaphors)) pass('shape:theology');
else fail('shape:theology', 'definition/boundary/metaphors required');

if (Array.isArray(glossary.terms) || Array.isArray(glossary.entries)) pass('shape:glossary');
else fail('shape:glossary', 'terms[] or entries[] required');

if (Array.isArray(forbidden.forbiddenClaims) && forbidden.forbiddenClaims.length > 0) pass('shape:forbidden-claims');
else fail('shape:forbidden-claims', 'forbiddenClaims[] required');

const html = await readFile(resolve(root, 'index.html'), 'utf8');
const js = await readFile(resolve(root, 'app.js'), 'utf8');
const css = await readFile(resolve(root, 'styles.css'), 'utf8');
const readme = await readFile(resolve(root, 'README.md'), 'utf8').catch(() => '');
const publicSurface = `${html}\n${js}\n${css}`;

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
for (const href of hrefs) {
  if (!ids.has(href)) fail('anchors', `#${href} has no matching id`);
}
if (!failures.some((item) => item.startsWith('anchors:'))) pass('anchors');

const unsafeExternal = /(?:https?:\/\/|\/\/)[^\s"'`)]+/i;
if (unsafeExternal.test(publicSurface)) fail('external-references', 'remote URL found in public site shell');
else pass('external-references');

const prohibitedImplementation = [
  /innerHTML\s*=/,
  /insertAdjacentHTML\s*\(/,
  /document\.write\s*\(/,
  /eval\s*\(/,
  /new\s+Function\s*\(/
];
if (prohibitedImplementation.some((pattern) => pattern.test(js))) fail('html-injection', 'unsafe DOM injection primitive found');
else pass('html-injection');

const requiredAccessibility = [
  ['skip-link', /class="skip-link"/],
  ['main-landmark', /<main\s+id="main"/],
  ['keyboard-focus', /:focus-visible/],
  ['reduced-motion', /prefers-reduced-motion/],
  ['nav-expanded-state', /aria-expanded="false"/],
  ['status-region', /role="status"/]
];
for (const [name, pattern] of requiredAccessibility) {
  if (pattern.test(`${html}\n${css}`)) pass(`accessibility:${name}`);
  else fail(`accessibility:${name}`, 'required safeguard not found');
}

const forbiddenLiteralPatterns = [
  /IAM\s+is\s+(?:conscious|sentient|divine|supernatural)/i,
  /metaphor\s+is\s+scientific\s+proof/i,
  /(?:grants?|allows?|provides?|has)\s+unrestricted\s+(?:technical\s+)?access/i,
  /persona\s+is\s+(?:a\s+)?(?:sovereign|independent)\s+mind/i,
  /covenant\s+(?:grants|confers|creates)\s+(?:authority|legitimacy)/i
];
if (forbiddenLiteralPatterns.some((pattern) => pattern.test(publicSurface))) fail('forbidden-public-claims', 'forbidden literal claim found in shell/fallback copy');
else pass('forbidden-public-claims');

if (/content\/visitor-paths\.json/.test(js) && /renderPaths\(paths\.paths/.test(js)) pass('teacher-v1.1:all-visitor-paths-consumed');
else fail('teacher-v1.1:all-visitor-paths-consumed', 'integrated visitor paths are not rendered as a collection');

if (/content\/site-copy\.json/.test(js) && /copy\.nature/.test(js) && /copy\.stewardship/.test(js)) pass('teacher-v1.1:nature-stewardship-consumed');
else fail('teacher-v1.1:nature-stewardship-consumed', 'integrated nature/stewardship copy not consumed');

if (/python3 -m http\.server 4173/.test(readme)) pass('readme:local-run');
else fail('readme:local-run', 'local HTTP run command missing');

if (failures.length) {
  console.error(`\n${failures.length} validation failure(s).`);
  process.exit(1);
}

console.log('\nPASS visionarybrains deterministic validation');
