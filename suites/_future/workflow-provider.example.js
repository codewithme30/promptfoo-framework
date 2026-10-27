/**
 * Author  : Anil Kalisetti
 * File    : suites/_future/workflow-provider.example.js
 * STATUS  : PLACEHOLDER - not registered in config/suites.js, never run by CI.
 *
 * Purpose : Test a whole multi-step workflow as ONE atomic test. The provider
 *           receives the list of steps in a variable, runs them in order against
 *           shared state, and returns the final result. Unlike `storeOutputAs`,
 *           chains can then run in parallel with each other, and a failed step
 *           cannot silently poison the next test.
 *
 * To implement
 *   1. Move this file to providers/workflow-provider.js and register it with
 *      `providers: ['file://providers/workflow-provider.js']` in a new suite.
 *   2. Pass the steps as JSON in a test var, e.g. vars.steps_json:
 *        '["Classify this ticket...", "List troubleshooting steps for {{previous}}"]'
 *   3. Replace `callModel` with a real call to the model under test. Reuse the
 *      promptfoo provider loader if you need the same models as the other suites.
 *   4. Return `{ output, metadata: { steps } }` so assertions can inspect every
 *      intermediate answer with a javascript assertion.
 *   5. Reference pattern: https://www.promptfoo.dev/docs/guides/evaluate-openai-agents-python/
 */
'use strict';

/** Placeholder for the real model call. Replace before use. */
async function callModel(/* messages */) {
  throw new Error('Not implemented: call the model under test here.');
}

class WorkflowProvider {
  id() {
    return 'workflow-provider';
  }

  async callApi(_prompt, context) {
    const steps = JSON.parse(context.vars.steps_json);
    const answers = [];
    let previous = '';

    for (const step of steps) {
      // Each step can refer to the previous answer with {{previous}}.
      const message = step.replaceAll('{{previous}}', previous);
      previous = await callModel([{ role: 'user', content: message }]);
      answers.push(previous);
    }

    return { output: previous, metadata: { steps: answers } };
  }
}

module.exports = WorkflowProvider;
