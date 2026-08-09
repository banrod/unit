import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const provenancePath = resolve(root, 'provenance/public-source-index.json');
const failures = [];

const pass = (name) => console.log(`PASS ${name}`);
const fail = (name, detail) => {
  failures.push(`${name}: ${detail}`);
  console.error(`FAIL ${name}: ${detail}`);
};

let index = {};
try {
  index = JSON.parse(await readFile(provenancePath, 'utf8'));
  pass('public-boundary:provenance-index-readable');
} catch (error) {
  fail('public-boundary:provenance-index-readable', error.message);
}

const allowed = new Set(['PUBLIC_CANON', 'PUBLIC_DERIVED']);
const sources = Array.isArray(index.sources) ? index.sources : [];

if (sources.length > 0 && sources.every((source) => allowed.has(source.classification))) {
  pass('public-boundary:classifications');
} else {
  fail('public-boundary:classifications', 'only PUBLIC_CANON and PUBLIC_DERIVED sources are permitted');
}

const serialized = JSON.stringify(index);
const forbiddenIndexPatterns = [
  /INTERNAL_ONLY/,
  /learning\/excavation-notes/i,
  /File Library artifact:/i,
  /\.docx\b/i,
  /lane-status/i,
  /work-queue/i
];

if (forbiddenIndexPatterns.some((pattern) => pattern.test(serialized))) {
  fail('public-boundary:provenance-redaction', 'private or control-plane provenance residue found');
} else {
  pass('public-boundary:provenance-redaction');
}

const prohibitedPaths = [
  'learning/excavation-notes',
  'learning/source-index.json',
  'lane-status',
  'work-queue.json'
];

for (const relativePath of prohibitedPaths) {
  try {
    await access(resolve(root, relativePath));
    fail('public-boundary:residue-paths', `${relativePath} must not exist in the public projection`);
  } catch {
    pass(`public-boundary:absent:${relativePath}`);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} public-boundary validation failure(s).`);
  process.exit(1);
}

console.log('\nPASS visionarybrains public distribution boundary');
