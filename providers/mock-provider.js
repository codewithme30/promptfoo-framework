/**
 * Author  : Anil Kalisetti
 * File    : providers/mock-provider.js
 * Purpose : Deterministic stand-in for an LLM so the framework runs with no API
 *           key, no GPU and no network (the `offline` profile).
 *
 * How it works
 *   Replies come from the ordered rule list in providers/mock-responses.js.
 *   The first rule whose `when.query` / `when.prompt` patterns match wins; a
 *   generic fallback is used otherwise. Rules can read the full rendered prompt,
 *   so conversation-memory tests genuinely prove the history was passed along.
 *
 * What offline runs prove - and do not prove
 *   They validate the framework wiring, test data, chaining and assertion logic.
 *   They say nothing about a real model's behaviour. Use the local or cloud
 *   profile for that.
 */
'use strict';

const rules = require('./mock-responses');

const FALLBACK_REPLY = 'I can help with that. Could you share a few more details?';

/** Replace $1, $2 ... in a reply template with capture groups from the query match. */
function renderReply(template, match) {
  return template.replace(/\$(\d)/g, (_, index) => (match && match[index]) || '');
}

/** Return the reply of the first matching rule. */
function pickReply(query, promptText) {
  for (const rule of rules) {
    const queryMatch = rule.when.query ? rule.when.query.exec(query) : [];
    if (!queryMatch) continue;
    if (rule.when.prompt && !rule.when.prompt.test(promptText)) continue;
    return renderReply(rule.reply, queryMatch);
  }
  return FALLBACK_REPLY;
}

/** Rough token estimate (about 4 characters per token) - good enough for usage reports. */
const estimateTokens = (text) => Math.ceil(text.length / 4);

class MockProvider {
  constructor(options = {}) {
    this.providerId = options.id || 'mock-llm';
    // Optional artificial latency, e.g. config: { delayMs: 50 }
    this.delayMs = Number(options.config?.delayMs ?? 0);
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt, context) {
    const query = String(context?.vars?.query ?? '');
    const promptText = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    const output = pickReply(query, promptText);

    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    const promptTokens = estimateTokens(promptText);
    const completionTokens = estimateTokens(output);
    return {
      output,
      tokenUsage: {
        total: promptTokens + completionTokens,
        prompt: promptTokens,
        completion: completionTokens,
      },
      cost: 0,
    };
  }
}

module.exports = MockProvider;
module.exports.pickReply = pickReply; // exported for the static self-check script
