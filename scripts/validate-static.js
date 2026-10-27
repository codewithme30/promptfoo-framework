#!/usr/bin/env node
/**
 * Author  : Anil Kalisetti
 * File    : scripts/validate-static.js
 * Purpose : Fast, offline sanity check that runs before `npm test`. It catches
 *           broken references and malformed test data before promptfoo starts:
 *             - every file:// reference points to a real file
 *             - YAML / JSON / JSONL / CSV test files parse
 *             - suite ids are unique and thresholds are valid
 *             - mock provider rules are well formed
 * YAML parsing needs the `js-yaml` dev dependency (installed by `npm install`).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { ROOT } = require('../config/profiles');
const { SUITES } = require('../config/suites');
const rules = require('../providers/mock-responses');

let yaml = null;
try {
  yaml = require('js-yaml');
} catch {
  console.warn('WARN js-yaml not installed - YAML files are checked for references only.');
}

const errors = [];
const fail = (message) => errors.push(message);
const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));

/** Strip the `file://` prefix and any `:functionName` suffix from a reference. */
const toPath = (reference) => reference.replace(/^file:\/\//, '').replace(/:[A-Za-z_]\w*$/, '');

/** Collect every file:// reference found in a text file. */
function findReferences(text) {
  return [...text.matchAll(/file:\/\/[^\s"',}\]]+/g)].map((match) => match[0]);
}

function checkReferences(relativePath) {
  const text = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  for (const reference of findReferences(text)) {
    if (!exists(toPath(reference))) fail(`${relativePath}: missing file for ${reference}`);
  }
  return text;
}

function checkTestFile(relativePath) {
  const text = checkReferences(relativePath);
  try {
    if (relativePath.endsWith('.json')) JSON.parse(text);
    else if (relativePath.endsWith('.jsonl')) text.split('\n').filter(Boolean).forEach((line) => JSON.parse(line));
    else if (relativePath.endsWith('.csv') && !text.split('\n')[0].includes('query')) fail(`${relativePath}: CSV needs a "query" column`);
    else if (/\.ya?ml$/.test(relativePath) && yaml) yaml.load(text);
  } catch (error) {
    fail(`${relativePath}: invalid content - ${error.message}`);
  }
}

function checkSuites() {
  const ids = new Set();
  for (const suite of SUITES) {
    if (ids.has(suite.id)) fail(`Duplicate suite id: ${suite.id}`);
    ids.add(suite.id);

    for (const profile of ['offline', 'local', 'cloud']) {
      const value = suite.thresholds?.[profile];
      if (typeof value !== 'number' || value < 0 || value > 1) fail(`${suite.id}: bad ${profile} threshold`);
    }
    for (const prompt of suite.prompts || []) {
      if (prompt.startsWith('file://') && !exists(toPath(prompt))) fail(`${suite.id}: missing prompt ${prompt}`);
    }
    for (const group of Object.values(suite.tests || {})) {
      for (const reference of group) {
        const relativePath = toPath(reference);
        if (!exists(relativePath)) fail(`${suite.id}: missing test file ${reference}`);
        else if (/\.(ya?ml|json|jsonl|csv)$/.test(relativePath)) checkTestFile(relativePath);
      }
    }
  }
}

function checkMockRules() {
  const ids = new Set();
  for (const rule of rules) {
    if (ids.has(rule.id)) fail(`mock-responses: duplicate rule id ${rule.id}`);
    ids.add(rule.id);
    if (!(rule.when?.query instanceof RegExp)) fail(`mock-responses: ${rule.id} needs when.query as a RegExp`);
    if (typeof rule.reply !== 'string' || rule.reply.length === 0) fail(`mock-responses: ${rule.id} needs a reply`);
  }
}

checkSuites();
checkMockRules();

if (errors.length > 0) {
  console.error(`Static validation failed (${errors.length} problem(s)):`);
  errors.forEach((message) => console.error(`  - ${message}`));
  process.exit(1);
}
console.log(`Static validation passed: ${SUITES.length} suites, ${rules.length} mock rules.`);
