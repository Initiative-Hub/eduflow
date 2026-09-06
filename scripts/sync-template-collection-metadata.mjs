import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const CATEGORY_FIELDS = [
  'description',
  'when_to_use',
  'prompt_hint',
  'content_guidance',
];

const FALLBACK_CATEGORY_METADATA = {
  IMAGE_GALLERY: {
    when_to_use:
      'Use when the presentation needs to compare exactly three visual categories, options, examples, or items in parallel.',
    prompt_hint:
      'Use for exactly 3 items that each benefit from an image. Fill each card with a short label, one-line caption, and a clear visual prompt or source image idea.',
    content_guidance: [
      'Use exactly three parallel items so the grid stays balanced.',
      'Choose items that can each be represented visually, not abstract filler.',
      'Keep labels short and captions concise so the images remain primary.',
    ],
  },
  KPI_BIG_NUMBERS: {
    when_to_use:
      'Use when the audience should quickly absorb a small set of headline metrics, benchmarks, or outcomes.',
    prompt_hint:
      'Use for 2 to 5 important numbers. Fill each metric with a value, unit or scale, and a label that explains why the number matters.',
    content_guidance: [
      'Pair every number with a precise label and unit, scale, or timeframe when relevant.',
      'Use only the most decision-relevant metrics rather than dumping raw stats.',
      'If there are more than 5 metrics, rank or group them before placing them here.',
    ],
  },
};

const FALLBACK_COLLECTION_DESCRIPTIONS = {
  clean_light:
    'Clean minimal light style: white background, near-black text, one strong blue accent, generous whitespace.',
  cultural_folk:
    'Rich cultural folk style with grounded earth tones for culture, community, and humanities topics.',
  default: 'Default slide template collection.',
  electric_green_white:
    'White-and-olive editorial automotive deck with bold contrast and premium brochure styling.',
  green_environment_care:
    'Environmental presentation style with forest-green editorial framing and nature-forward visuals.',
  illustrative_culture:
    'Illustrative culture collection with warm paper textures and hand-drawn architectural accents.',
  neon_dark:
    'High-tech dark theme with electric cyan and magenta accents for tech and AI decks.',
  organic_streets:
    'Organic illustration style with cream paper, plum headlines, and old-town line art.',
  pastel_pop:
    'Soft pastel style: blush background, white cards, rose pink and mint accents, friendly rounded feel.',
  rmit_red_modern:
    'Academic presentation style with crisp white space, bold red framing, and clean institutional typography.',
  startup_neon_pitch:
    'Startup pitch deck style with dark backgrounds, neon accents, and high-contrast business layouts.',
  templates: 'Base slide layout collection.',
  vintage:
    'Vintage / retro style with aged cream paper, rust red and sage green accents, and serif typography.',
};

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function collectCategoryMetadata(collectionDir) {
  const categories = {};
  const entries = readdirSync(collectionDir);

  for (const entry of entries) {
    const entryPath = path.join(collectionDir, entry);
    if (!statSync(entryPath).isDirectory()) {
      continue;
    }

    const categoryJsonPath = path.join(entryPath, 'category.json');
    if (!existsSync(categoryJsonPath)) {
      continue;
    }

    const raw = readJson(categoryJsonPath);
    const fallback = FALLBACK_CATEGORY_METADATA[entry] ?? {};
    const metadata = Object.fromEntries(
      CATEGORY_FIELDS.flatMap((field) => {
        const value = raw[field] ?? fallback[field];
        return value === undefined ? [] : [[field, value]];
      })
    );

    if (Object.keys(metadata).length > 0) {
      categories[entry] = metadata;
    }
  }

  return categories;
}

function buildCollectionManifest(collectionDir, existingManifest = {}) {
  const collectionName = path.basename(collectionDir);
  const categories = collectCategoryMetadata(collectionDir);

  return {
    ...existingManifest,
    name: existingManifest.name ?? collectionName,
    description:
      existingManifest.description ??
      FALLBACK_COLLECTION_DESCRIPTIONS[collectionName] ??
      `Slide template collection '${collectionName}'.`,
    categories,
  };
}

export function syncCollectionManifest(collectionDir) {
  const manifestPath = path.join(collectionDir, 'collection.json');
  const existingManifest = existsSync(manifestPath)
    ? readJson(manifestPath)
    : {};
  const nextManifest = buildCollectionManifest(collectionDir, existingManifest);
  writeJson(manifestPath, nextManifest);
  return nextManifest;
}

export function syncTemplateRoot(rootDir) {
  const collections = readdirSync(rootDir)
    .map((entry) => path.join(rootDir, entry))
    .filter((entryPath) => statSync(entryPath).isDirectory());

  return collections.map((collectionDir) => ({
    collectionDir,
    manifest: syncCollectionManifest(collectionDir),
  }));
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const rootDir = process.argv[2];
  if (!rootDir) {
    console.error(
      'Usage: node scripts/sync-template-collection-metadata.mjs <template-root>'
    );
    process.exit(1);
  }

  const result = syncTemplateRoot(path.resolve(rootDir));
  console.log(
    `Updated ${result.length} collection manifests in ${path.resolve(rootDir)}`
  );
}
