#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const MESSAGES_DIR = path.join(process.cwd(), 'messages');

function sortObjectKeysDeep(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const sorted = {};
  const keys = Object.keys(value).sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' })
  );

  for (const key of keys) {
    sorted[key] = sortObjectKeysDeep(value[key]);
  }

  return sorted;
}

function findMessageFiles() {
  if (!fs.existsSync(MESSAGES_DIR)) {
    return [];
  }

  return fs
    .readdirSync(MESSAGES_DIR)
    .filter((entry) => entry.endsWith('.json'))
    .map((entry) => path.join(MESSAGES_DIR, entry))
    .sort((left, right) => left.localeCompare(right));
}

function processFile(filePath, checkOnly) {
  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(originalContent);
    const sorted = sortObjectKeysDeep(parsed);
    const sortedContent = `${JSON.stringify(sorted, null, 2)}\n`;

    if (checkOnly) {
      return {
        filePath,
        isSorted: JSON.stringify(parsed) === JSON.stringify(sorted),
      };
    }

    const wasChanged = originalContent !== sortedContent;
    if (wasChanged) {
      fs.writeFileSync(filePath, sortedContent, 'utf8');
    }

    return {
      filePath,
      wasChanged,
    };
  } catch (error) {
    return {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function main() {
  const checkOnly = process.argv.slice(2).includes('--check');
  const files = findMessageFiles();

  if (files.length === 0) {
    console.error('No translation files found in messages/.');
    process.exit(1);
  }

  const results = files.map((filePath) => processFile(filePath, checkOnly));
  const failures = results.filter((result) => result.error);

  if (failures.length > 0) {
    console.error('Failed to process translation files:');
    for (const failure of failures) {
      console.error(
        `- ${path.relative(process.cwd(), failure.filePath)}: ${failure.error}`
      );
    }
    process.exit(1);
  }

  if (checkOnly) {
    const unsorted = results.filter((result) => !result.isSorted);
    if (unsorted.length > 0) {
      console.error('The following translation files are not sorted:');
      for (const result of unsorted) {
        console.error(`- ${path.relative(process.cwd(), result.filePath)}`);
      }
      console.error('\nRun `bun i18n:sort` to fix them.');
      process.exit(1);
    }

    console.log('All translation files are sorted.');
    return;
  }

  const changed = results.filter((result) => result.wasChanged);
  if (changed.length === 0) {
    console.log('All translation files were already sorted.');
    return;
  }

  console.log('Sorted translation files:');
  for (const result of changed) {
    console.log(`- ${path.relative(process.cwd(), result.filePath)}`);
  }
}

main();
