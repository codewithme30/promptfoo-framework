#!/usr/bin/env node
/**
 * Author  : Anil Kalisetti
 * File    : scripts/run-suites.js
 * Purpose : Run the selected suites through `promptfoo eval`, write JSON / HTML /
 *           JUnit reports to reports/, and enforce each suite's pass-rate
 *           threshold (config/suites.js). Exits with code 1 when any suite is
 *           below its threshold or errors, so CI can block the merge.
 *
 * Usage:
 *   node scripts/run-suites.js [--profile offline|local|cloud] [--suites id1,id2|all]
 * Settings come from .env; command-line flags win over .env.
 */
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT, resolveProfile } = require('../config/profiles');
const { SUITES } = require('../config/suites');
const { isRunnable } = require('../config/build-config');

const REPORT_DIR = path.join(ROOT, 'reports');
// promptfoo exits with 100 when tests fail; the pass rate is judged by this script instead.
const PROMPTFOO_TESTS_FAILED_EXIT_CODE = 100;

/** Read `--profile` and `--suites` from the command line. */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--profile') args.profile = argv[(i += 1)];
    else if (argv[i] === '--suites') args.suites = argv[(i += 1)];
  }
  return args;
}

/** Resolve the list of suites to run from the flag or the SUITES variable. */
function selectSuites(requested) {
  if (!requested || requested === 'all') return SUITES;
  const ids = requested.split(',').map((id) => id.trim()).filter(Boolean);
  const unknown = ids.filter((id) => !SUITES.some((suite) => suite.id === id));
  if (unknown.length > 0) {
    throw new Error(`Unknown suite id(s): ${unknown.join(', ')}. Valid: ${SUITES.map((s) => s.id).join(', ')}`);
  }
  return SUITES.filter((suite) => ids.includes(suite.id));
}

/** Count passes, failures and errors from a promptfoo JSON report. */
function readStats(jsonFile) {
  const report = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const stats = report.results?.stats;
  if (stats) {
    return { passed: stats.successes ?? 0, failed: stats.failures ?? 0, errored: stats.errors ?? 0 };
  }
  // Fallback for report layouts without a stats block: count the individual results.
  const rows = report.results?.results ?? [];
  const passed = rows.filter((row) => row.success).length;
  return { passed, failed: rows.length - passed, errored: 0 };
}

/** Run one suite through promptfoo and compare its pass rate with the threshold. */
function runSuite(suite, profile) {
  const outputBase = path.join(REPORT_DIR, suite.id);
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = [
    '--no-install', 'promptfoo', 'eval',
    '-c', 'promptfooconfig.js',
    '-o', `${outputBase}.json`,
    '-o', `${outputBase}.html`,
    '-o', `${outputBase}.junit.xml`,
  ];
  if (profile.noCache) args.push('--no-cache');
  if (profile.repeat > 1) args.push('--repeat', String(profile.repeat));

  console.log(`\n=== ${suite.id}: ${suite.title}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, PF_SUITE: suite.id, PF_PROFILE: profile.name },
  });

  const crashed =
    result.error || ![0, PROMPTFOO_TESTS_FAILED_EXIT_CODE].includes(result.status) ||
    !fs.existsSync(`${outputBase}.json`);
  if (crashed) {
    return { id: suite.id, status: 'error', detail: result.error?.message || `exit code ${result.status}` };
  }

  const { passed, failed, errored } = readStats(`${outputBase}.json`);
  const total = passed + failed + errored;
  const passRate = total === 0 ? 0 : passed / total;
  const threshold = suite.thresholds[profile.name] ?? 1;
  return {
    id: suite.id,
    status: passRate >= threshold ? 'pass' : 'fail',
    passed, failed, errored, total, passRate, threshold,
  };
}

function printSummary(rows) {
  console.log('\n================ Summary ================');
  for (const row of rows) {
    if (row.status === 'skipped') {
      console.log(`SKIP  ${row.id.padEnd(20)} ${row.detail}`);
    } else if (row.status === 'error') {
      console.log(`ERROR ${row.id.padEnd(20)} ${row.detail}`);
    } else {
      const rate = `${(row.passRate * 100).toFixed(1)}%`;
      const need = `${(row.threshold * 100).toFixed(0)}%`;
      const label = row.status === 'pass' ? 'PASS ' : 'FAIL ';
      console.log(`${label} ${row.id.padEnd(20)} ${row.passed}/${row.total} passed (${rate}, needs ${need})`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const profile = resolveProfile(args.profile);
  const suites = selectSuites(args.suites || process.env.SUITES);

  // Results stay on this machine: switch off telemetry and update checks unless the user set them.
  process.env.PROMPTFOO_DISABLE_TELEMETRY ??= '1';
  process.env.PROMPTFOO_DISABLE_UPDATE ??= '1';

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  console.log(`Profile: ${profile.name} | target: ${profile.target} | grader: ${profile.grader ?? 'none'}`);

  const rows = suites.map((suite) =>
    isRunnable(suite, profile)
      ? runSuite(suite, profile)
      : { id: suite.id, status: 'skipped', detail: `not available in the "${profile.name}" profile (needs grader, Python or performance support)` },
  );

  printSummary(rows);
  fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify({ profile: profile.name, rows }, null, 2));

  const blocked = rows.some((row) => row.status === 'fail' || row.status === 'error');
  process.exit(blocked ? 1 : 0);
}

try {
  main();
} catch (error) {
  console.error(`\n${error.message}`);
  process.exit(1);
}
