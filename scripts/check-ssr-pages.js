#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const SRC_DIR = path.join(process.cwd(), 'src');

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function findPageFiles() {
  if (!fs.existsSync(SRC_DIR)) {
    return [];
  }

  return walk(SRC_DIR)
    .filter((filePath) => filePath.endsWith(`${path.sep}page.tsx`))
    .sort((left, right) => left.localeCompare(right));
}

function findUseClientDirectiveLine(content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  let inBlockComment = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (inBlockComment) {
      if (line.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    if (!line) {
      continue;
    }

    if (line.startsWith('/*')) {
      if (!line.includes('*/')) {
        inBlockComment = true;
      }
      continue;
    }

    if (line.startsWith('//')) {
      continue;
    }

    if (/^['"]use client['"];?$/.test(line)) {
      return index + 1;
    }

    if (/^['"][^'"]+['"];?$/.test(line)) {
      continue;
    }

    break;
  }

  return null;
}

function main() {
  const pageFiles = findPageFiles();

  if (pageFiles.length === 0) {
    console.log('No src/**/page.tsx files found.');
    return;
  }

  const violations = [];

  for (const filePath of pageFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const line = findUseClientDirectiveLine(content);

    if (line !== null) {
      violations.push({ filePath, line });
    }
  }

  if (violations.length === 0) {
    console.log(
      `SSR page check passed. No 'use client' directives found in any page.tsx files.`
    );
    return;
  }

  console.error(
    `SSR page check failed. Found ${violations.length} page.tsx file(s) with top-level 'use client' directives:`
  );

  for (const violation of violations) {
    console.error(
      `- ${path.relative(process.cwd(), violation.filePath)}:${violation.line}`
    );
  }

  console.error(
    '\nMove interactive logic into nearby client components and keep page.tsx as a Server Component entry.'
  );

  process.exit(1);
}

main();
