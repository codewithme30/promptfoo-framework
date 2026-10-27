/**
 * Author  : Anil Kalisetti
 * File    : config/build-config.js
 * Purpose : Turn a suite definition (config/suites.js) plus the resolved profile
 *           into a promptfoo configuration object.
 *
 * Why a JS builder instead of plain YAML?
 *   Provider ids, grader models and feature switches come from `.env`. Building
 *   the config in code keeps all of that in one place and avoids relying on
 *   environment templating inside every YAML field.
 */
'use strict';

const DEFAULT_PROMPTS = ['file://prompts/chat.json'];

// Every suite starts from these vars; a suite or an individual test may override them.
const DEFAULT_VARS = {
  system: 'file://prompts/domains/customer-support.txt',
  query: '',
};

/**
 * Select the test sources that apply to this profile.
 * Tests are grouped by what they need so unsupported groups are skipped cleanly:
 *   deterministic : always run, need no grader and no network.
 *   modelGraded   : need a grader model (local / cloud profiles).
 *   python        : need a Python runtime (ENABLE_PYTHON_GRADERS=true).
 *   performance   : cost / latency thresholds (offline and cloud profiles).
 */
function collectTests(suite, profile) {
  const groups = suite.tests || {};
  return [
    ...(groups.deterministic || []),
    ...(profile.modelGraded ? groups.modelGraded || [] : []),
    ...(profile.python ? groups.python || [] : []),
    ...(profile.performance ? groups.performance || [] : []),
  ];
}

/** A suite is runnable when it has at least one test source or scenario for this profile. */
function isRunnable(suite, profile) {
  const hasScenarios = Array.isArray(suite.scenarios) && suite.scenarios.length > 0;
  return collectTests(suite, profile).length > 0 || hasScenarios;
}

/** Provider options that tell model-graded assertions which models to use. */
function buildGradingOptions(profile) {
  if (!profile.grader) return {};
  const provider = { text: { id: profile.grader } };
  if (profile.embedding) provider.embedding = { id: profile.embedding };
  return { provider };
}

/**
 * Build the promptfoo config for one suite.
 * @param {object} suite   Entry from config/suites.js.
 * @param {object} profile Result of resolveProfile().
 */
function buildConfig(suite, profile) {
  if (!isRunnable(suite, profile)) {
    throw new Error(
      `Suite "${suite.id}" has nothing to run in the "${profile.name}" profile ` +
        '(it needs a grader, Python or performance support). Try PROFILE=local or PROFILE=cloud.',
    );
  }

  const tests = collectTests(suite, profile);

  return {
    description: `${suite.title} [profile: ${profile.name}]`,
    prompts: suite.prompts || DEFAULT_PROMPTS,
    providers: suite.providers || [profile.target],
    defaultTest: {
      vars: { ...DEFAULT_VARS, ...suite.defaultVars },
      options: {
        // Trims whitespace and trailing punctuation on short answers so exact-match checks stay stable.
        transform: 'file://transforms/normalize-output.js',
        ...buildGradingOptions(profile),
        ...suite.defaultOptions,
      },
    },
    ...(tests.length > 0 && { tests }),
    ...(suite.scenarios && { scenarios: suite.scenarios }),
    ...(suite.derivedMetrics && { derivedMetrics: suite.derivedMetrics }),
    // Chained and conversation suites depend on execution order, so they run one test at a time.
    evaluateOptions: { maxConcurrency: suite.serial ? 1 : profile.maxConcurrency },
  };
}

module.exports = { buildConfig, collectTests, isRunnable };
