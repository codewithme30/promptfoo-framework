/**
 * Author  : Anil Kalisetti
 * File    : datasets/js/generate-tests.js
 * Purpose : Generate test cases in code. Useful when many cases follow one
 *           pattern - here one question for each type of bank card.
 *
 * Referenced from config/suites.js as:
 *   file://datasets/js/generate-tests.js:generateTests
 */
'use strict';

const CARD_TYPES = ['debit', 'credit', 'prepaid'];

function generateTests() {
  return CARD_TYPES.map((type) => ({
    description: `JS generator - explains what a ${type} card is`,
    vars: {
      system: 'file://prompts/domains/banking.txt',
      query: `What is a ${type} card? Answer in one sentence.`,
    },
    assert: [{ type: 'icontains', value: type }],
  }));
}

module.exports = { generateTests };
