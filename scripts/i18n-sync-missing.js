#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const SOURCE_FILE = path.join(MESSAGES_DIR, 'en.json');
const TARGET_FILE = path.join(MESSAGES_DIR, 'vi.json');

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sortObjectKeysDeep(value) {
  if (!isPlainObject(value)) {
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

function getNestedValue(object, keyPath) {
  return keyPath.reduce((current, key) => {
    if (!isPlainObject(current) || !(key in current)) {
      return undefined;
    }

    return current[key];
  }, object);
}

function setNestedValue(object, keyPath, value) {
  let current = object;

  for (let index = 0; index < keyPath.length - 1; index += 1) {
    const key = keyPath[index];
    if (!isPlainObject(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keyPath[keyPath.length - 1]] = value;
}

function collectLeafPaths(object, prefix = []) {
  const paths = [];

  for (const [key, value] of Object.entries(object)) {
    const nextPrefix = [...prefix, key];
    if (isPlainObject(value)) {
      paths.push(...collectLeafPaths(value, nextPrefix));
    } else {
      paths.push(nextPrefix);
    }
  }

  return paths;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  if (!fs.existsSync(SOURCE_FILE) || !fs.existsSync(TARGET_FILE)) {
    console.error('Expected messages/en.json and messages/vi.json to exist.');
    process.exit(1);
  }

  const source = loadJson(SOURCE_FILE);
  const target = loadJson(TARGET_FILE);
  const sourceLeafPaths = collectLeafPaths(source);
  let addedCount = 0;

  for (const keyPath of sourceLeafPaths) {
    if (getNestedValue(target, keyPath) !== undefined) {
      continue;
    }

    setNestedValue(target, keyPath, getNestedValue(source, keyPath));
    addedCount += 1;
  }

  if (addedCount === 0) {
    console.log('No missing keys found in messages/vi.json.');
    return;
  }

  const sortedTarget = sortObjectKeysDeep(target);
  fs.writeFileSync(TARGET_FILE, `${JSON.stringify(sortedTarget, null, 2)}\n`, 'utf8');

  console.log(`Added ${addedCount} missing key(s) to messages/vi.json.`);
  console.log('English values were copied as placeholders.');
}

main();
