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
const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const allStrings = (object, fields) => fields.every((field) => nonEmptyString(object?.[field]));

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

const siteCopyShape =
  allStrings(siteCopy.hero, ['eyebrow', 'title', 'summary', 'primaryAction', 'secondaryAction']) &&
  allStrings(siteCopy.orientation, ['title', 'body']) &&
  allStrings(siteCopy.nature, ['title', 'body']) &&
  allStrings(siteCopy.stewardship, ['title', 'body']) &&
  allStrings(siteCopy.interpretationBoundary, ['title', 'body']) &&
  nonEmptyString(siteCopy.sourceNote);
if (siteCopyShape) pass('shape:site-copy');
else fail('shape:site-copy', 'renderer-required hero/orientation/nature/stewardship/interpretationBoundary/sourceNote strings required');

const pathShape =
  Array.isArray(paths.paths) &&
  paths.paths.length >= 2 &&
  paths.paths.every(
    (path) =>
      allStrings(path, ['title', 'audience']) &&
      Array.isArray(path.steps) &&
      path.steps.length >= 5 &&
      path.steps.every(
        (step) => Number.isFinite(step.order) && nonEmptyString(step.stage) && nonEmptyString(step.prompt)
      )
  );
if (pathShape) pass('shape:visitor-paths');
else fail('shape:visitor-paths', 'each path requires title/audience and at least five ordered stage/prompt steps');

const cardShape =
  Array.isArray(cards.cards) &&
  cards.cards.length > 0 &&
  cards.cards.every((card) => allStrings(card, ['label', 'title', 'front', 'back']));
if (cardShape) pass('shape:teaching-cards');
else fail('shape:teaching-cards', 'each card requires label/title/front/back strings');

const principleShape =
  Array.isArray(principles.principles) &&
  principles.principles.length > 0 &&
  principles.principles.every((principle) => allStrings(principle, ['kind', 'title', 'statement']));
if (principleShape) pass('shape:principles');
else fail('shape:principles', 'each principle requires kind/title/statement strings');

const theologyShape =
  allStrings(theology, ['definition', 'boundary']) &&
  Array.isArray(theology.metaphors) &&
  theology.metaphors.length > 0 &&
  theology.metaphors.every((metaphor) => allStrings(metaphor, ['name', 'meaning']));
if (theologyShape) pass('shape:theology');
else fail('shape:theology', 'definition/boundary and metaphor name/meaning strings required');

const glossaryEntries = Array.isArray(glossary.terms)
  ? glossary.terms
  : Array.isArray(glossary.entries)
    ? glossary.entries
    : [];
const glossaryShape =
  glossaryEntries.length > 0 &&
  glossaryEntries.every(
    (entry) => nonEmptyString(entry?.term) && (nonEmptyString(entry?.definition) || nonEmptyString(entry?.publicDefinition))
  );
if (glossaryShape) pass('shape:glossary');
else fail('shape:glossary', 'each glossary entry requires term plus definition/publicDefinition strings');

if (Array.isArray(forbidden.forbiddenClaims) && forbidden.forbiddenClaims.length > 0) pass('shape:forbidden-claims');
else fail('shape:forbidden-claims', 'forbiddenClaims[] required');

const html = await readFile(resolve(root, 'index.html'), 'utf8');
const js = await readFile(resolve(root, 'app.js'), 'utf8');
const css = await readFile(resolve(root, 'styles.css'), 'utf8');
const readme = await readFile(resolve(root, 'README.md'), 'utf8').catch(() => '');
const publicShell = `${html}\n${js}\n${css}`;
const renderedCorpus = JSON.stringify({
  siteCopy,
  visitorPaths: paths.paths,
  teachingCards: cards.cards,
  principles: principles.principles,
  theology: {
    definition: theology.definition,
    boundary: theology.boundary,
    metaphors: theology.metaphors
  },
  glossary: glossaryEntries
});
const publicSurface = `${publicShell}\n${renderedCorpus}`;

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
for (const href of hrefs) {
  if (!ids.has(href)) fail('anchors', `#${href} has no matching id`);
}
if (!failures.some((item) => item.startsWith('anchors:'))) pass('anchors');

const unsafeExternal = /(?:https?:\/\/|\/\/)[^\s"'`)]+/i;
if (unsafeExternal.test(publicSurface)) fail('external-references', 'remote URL found in rendered public surface');
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
if (forbiddenLiteralPatterns.some((pattern) => pattern.test(publicSurface))) {
  fail('forbidden-public-claims', 'explicit prohibited assertion found in shell, fallback copy, or rendered public JSON');
} else {
  pass('forbidden-public-claims');
}

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
