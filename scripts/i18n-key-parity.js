#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const EN_FILE = path.join(MESSAGES_DIR, 'en.json');
const VI_FILE = path.join(MESSAGES_DIR, 'vi.json');

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function extractLeafPaths(object, prefix = '') {
  const keys = [];

  for (const [key, value] of Object.entries(object)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      keys.push(...extractLeafPaths(value, nextKey));
    } else {
      keys.push(nextKey);
    }
  }

  return keys;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  if (!fs.existsSync(EN_FILE) || !fs.existsSync(VI_FILE)) {
    console.error('Expected messages/en.json and messages/vi.json to exist.');
    process.exit(1);
  }

  const en = loadJson(EN_FILE);
  const vi = loadJson(VI_FILE);
  const enKeys = new Set(extractLeafPaths(en));
  const viKeys = new Set(extractLeafPaths(vi));

  const missingInVi = [...enKeys].filter((key) => !viKeys.has(key)).sort();
  const missingInEn = [...viKeys].filter((key) => !enKeys.has(key)).sort();

  if (missingInVi.length === 0 && missingInEn.length === 0) {
    console.log('messages/en.json and messages/vi.json have matching keys.');
    return;
  }

  if (missingInVi.length > 0) {
    console.error(`Missing in messages/vi.json (${missingInVi.length}):`);
    for (const key of missingInVi) {
      console.error(`- ${key}`);
    }
  }

  if (missingInEn.length > 0) {
    console.error(`Missing in messages/en.json (${missingInEn.length}):`);
    for (const key of missingInEn) {
      console.error(`- ${key}`);
    }
  }

  process.exit(1);
}

main();
