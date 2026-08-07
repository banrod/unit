const $ = (selector) => document.querySelector(selector);

const fallback = {
  cards: [
    {
      label: 'Principle',
      title: 'Coherence',
      front: 'Identity is more than a label.',
      back: 'It is the maintained relationship among purpose, boundaries, permissions, memory, and action.'
    }
  ],
  principles: [
    {
      kind: 'principle',
      title: 'Agency includes authorship',
      statement: 'Agency includes influence over framing, visible alternatives, and challenge paths within explicit constraints.'
    },
    {
      kind: 'architecture',
      title: 'Translation must preserve accountability',
      statement: 'Interfaces should distinguish source from interpretation and keep uncertainty visible.'
    },
    {
      kind: 'practice',
      title: 'Conscience means disciplined checks',
      statement: 'Check clarity, legitimate authority, provenance, proportionality, recoverability, and future options.'
    }
  ],
  metaphors: [
    {
      name: 'Author at the Threshold',
      meaning: 'Agency includes shaping the frame and challenge path while remaining inside explicit constraints.'
    },
    {
      name: "Translator's Lantern",
      meaning: 'An interface keeps source, interpretation, uncertainty, omission, and authority visible during translation.'
    }
  ],
  theologyDefinition: 'Optional metaphorical language for meaning and orientation within IAM.',
  theologyBoundary: 'Metaphors orient interpretation; they do not confer technical, legal, moral, scientific, or religious authority.',
  paths: [
    {
      title: 'Begin with IAM',
      audience: 'Visitors with no prior IAM ecosystem knowledge',
      steps: [
        { order: 1, stage: 'first encounter', prompt: 'What remains coherent when tools and contexts change?' },
        { order: 2, stage: 'orientation', prompt: 'What may this part of the system actually do?' },
        { order: 3, stage: 'deepening', prompt: 'Is this metaphor, principle, architecture, or operational fact?' },
        { order: 4, stage: 'practice', prompt: 'Can the inputs, outputs, and transformations be seen?' },
        { order: 5, stage: 'synthesis', prompt: 'How do identity, agency, stewardship, and meaning fit together?' }
      ]
    }
  ],
  glossary: [
    ['Agency', 'The bounded capacity to act through explicit permission.'],
    ['Interface', 'A visible boundary translating intention into action.'],
    ['Stewardship', 'Responsible care for capability, memory, and consequences.'],
    ['Theology', 'Optional mythic language used to explore meaning without replacing evidence.']
  ]
};

function text(element, value) {
  if (element) element.textContent = String(value ?? '');
}

function card(label, title, body, detail = '') {
  const article = document.createElement('article');
  article.className = 'card';

  const kicker = document.createElement('p');
  kicker.className = 'card-label';
  text(kicker, label);

  const heading = document.createElement('h3');
  text(heading, title);

  const primary = document.createElement('p');
  text(primary, body);

  article.append(kicker, heading, primary);

  if (detail) {
    const secondary = document.createElement('p');
    text(secondary, detail);
    article.append(secondary);
  }

  return article;
}

function renderCards(cards) {
  $('#cards').replaceChildren(...cards.map((item) => card(item.label, item.title, item.front, item.back)));
}

function renderPrinciples(principles) {
  $('#principle-list').replaceChildren(
    ...principles.slice(0, 12).map((item) => card(item.kind || 'principle', item.title, item.statement))
  );
}

function renderTheology(theology) {
  const metaphors = theology.metaphors || fallback.metaphors;
  text($('#theology-definition'), theology.definition || fallback.theologyDefinition);
  text($('#theology-boundary'), theology.boundary || fallback.theologyBoundary);
  $('#theology-metaphors').replaceChildren(
    ...metaphors.slice(0, 8).map((item) => card('optional metaphor', item.name, item.meaning))
  );
}

function renderPaths(paths) {
  const fragments = paths.map((path) => {
    const article = document.createElement('article');
    article.className = 'path-card';

    const heading = document.createElement('h3');
    text(heading, path.title);

    const audience = document.createElement('p');
    audience.className = 'path-audience';
    text(audience, path.audience);

    const list = document.createElement('ol');
    list.className = 'path-list';

    const steps = (path.steps || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const step of steps) {
      const item = document.createElement('li');
      const strong = document.createElement('strong');
      text(strong, String(step.stage || 'stage').replaceAll('-', ' '));
      item.append(strong, document.createTextNode(` — ${step.prompt || ''}`));
      list.append(item);
    }

    article.append(heading, audience, list);

    if (path.completion) {
      const completion = document.createElement('p');
      completion.className = 'path-completion';
      text(completion, path.completion);
      article.append(completion);
    }

    return article;
  });

  $('#visitor-paths').replaceChildren(...fragments);
}

function renderGlossary(entries) {
  $('#glossary-list').replaceChildren(
    ...entries.slice(0, 18).map((entry) => {
      const wrap = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      text(dt, entry.term || entry[0]);
      text(dd, entry.definition || entry.publicDefinition || entry[1]);
      wrap.append(dt, dd);
      return wrap;
    })
  );
}

function renderSiteCopy(copy) {
  text($('#hero-eyebrow'), copy.hero?.eyebrow);
  text($('#hero-title'), copy.hero?.title);
  text($('#hero-summary'), copy.hero?.summary);
  text($('#hero-primary'), copy.hero?.primaryAction);
  text($('#hero-secondary'), copy.hero?.secondaryAction);
  text($('#orientation-title'), copy.orientation?.title);
  text($('#orientation-body'), copy.orientation?.body);
  text($('#nature-title'), copy.nature?.title);
  text($('#nature-body'), copy.nature?.body);
  text($('#stewardship-title'), copy.stewardship?.title);
  text($('#stewardship-body'), copy.stewardship?.body);
  text($('#boundary-title'), copy.interpretationBoundary?.title);
  text($('#source-note'), copy.sourceNote);
}

async function json(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

async function load() {
  renderCards(fallback.cards);
  renderPrinciples(fallback.principles);
  renderTheology({
    definition: fallback.theologyDefinition,
    boundary: fallback.theologyBoundary,
    metaphors: fallback.metaphors
  });
  renderPaths(fallback.paths);
  renderGlossary(fallback.glossary);

  try {
    const [cards, paths, glossary, principles, theology, siteCopy] = await Promise.all(
      [
        'content/teaching-cards.json',
        'content/visitor-paths.json',
        'content/glossary.json',
        'content/principles.json',
        'content/theology.json',
        'content/site-copy.json'
      ].map(json)
    );

    renderCards(cards.cards || []);
    renderPrinciples(principles.principles || []);
    renderTheology(theology);
    renderPaths(paths.paths || []);
    renderGlossary(glossary.terms || glossary.entries || fallback.glossary);
    renderSiteCopy(siteCopy);
    text($('#load-status'), 'Public-safe teaching content loaded from integrated doctrine and teaching files.');
  } catch (error) {
    console.warn(error);
    text(
      $('#load-status'),
      'Built-in public-safe teaching content is shown. Serve this directory over HTTP to load the complete integrated teaching corpus.'
    );
  }
}

const toggle = $('.nav-toggle');
const nav = $('#primary-nav');

toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  nav.dataset.open = String(!open);
});

nav?.addEventListener('click', (event) => {
  if (event.target.matches('a')) {
    toggle.setAttribute('aria-expanded', 'false');
    nav.dataset.open = 'false';
  }
});

load();
