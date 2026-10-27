/**
 * Author  : Anil Kalisetti
 * File    : config/profiles.js
 * Purpose : Resolve the run profile (offline | local | cloud) from environment
 *           variables. This is the only place that reads `.env` settings, so the
 *           rest of the framework never touches process.env directly.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

/** Load `.env` if present. Existing environment variables always win. */
function loadDotEnv() {
  const envFile = path.join(ROOT, '.env');
  if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envFile);
  }
}

/**
 * Built-in defaults per profile.
 * - modelGraded : whether llm-rubric / factuality / similar tests can run.
 * - performance : whether cost/latency tests run. Ollama reports no cost, so
 *                 the `local` profile skips them.
 */
const PROFILE_DEFAULTS = {
  offline: {
    target: 'file://providers/mock-provider.js',
    grader: null,
    embedding: null,
    modelGraded: false,
    performance: true,
  },
  local: {
    // llama3.2:3b needs ~2 GB of memory, so the profile fits an 8 GB laptop.
    // Use a larger grader (e.g. a 7-8B model) on 16 GB machines for better judging.
    target: 'ollama:chat:llama3.2:3b',
    grader: 'ollama:chat:llama3.2:3b',
    embedding: 'ollama:embeddings:nomic-embed-text',
    modelGraded: true,
    performance: false,
  },
  cloud: {
    target: null, // must be supplied through TARGET_PROVIDER
    grader: null, // falls back to TARGET_PROVIDER
    embedding: 'openai:embeddings:text-embedding-3-small',
    modelGraded: true,
    performance: true,
  },
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

/** Parse a boolean-like env value; empty or missing returns the fallback. */
function asBool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return TRUE_VALUES.has(String(value).toLowerCase());
}

/** Parse a positive integer env value; invalid or missing returns the fallback. */
function asPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Build the resolved profile object used by the config builder and the runner.
 * @param {string} [override] Profile name that wins over the PROFILE variable.
 */
function resolveProfile(override) {
  loadDotEnv();

  const name = (override || process.env.PROFILE || 'offline').toLowerCase();
  const defaults = PROFILE_DEFAULTS[name];
  if (!defaults) {
    throw new Error(
      `Unknown PROFILE "${name}". Use one of: ${Object.keys(PROFILE_DEFAULTS).join(', ')}.`,
    );
  }

  // The offline profile is fixed on purpose: it must never depend on user settings.
  const isOffline = name === 'offline';
  const target = isOffline ? defaults.target : process.env.TARGET_PROVIDER || defaults.target;
  const grader = isOffline ? null : process.env.GRADER_PROVIDER || defaults.grader || target;
  const embedding = isOffline ? null : process.env.EMBEDDING_PROVIDER || defaults.embedding;

  if (!target) {
    throw new Error(`PROFILE=${name} requires TARGET_PROVIDER to be set in .env.`);
  }

  return {
    name,
    target,
    grader,
    embedding,
    modelGraded: defaults.modelGraded,
    performance: defaults.performance,
    python: asBool(process.env.ENABLE_PYTHON_GRADERS, false),
    maxConcurrency: asPositiveInt(process.env.MAX_CONCURRENCY, 4),
    repeat: asPositiveInt(process.env.REPEAT, 1),
    noCache: asBool(process.env.NO_CACHE, false),
  };
}

module.exports = { ROOT, resolveProfile, PROFILE_DEFAULTS };
