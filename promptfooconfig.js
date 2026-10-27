/**
 * Author  : Anil Kalisetti
 * File    : promptfooconfig.js
 * Purpose : promptfoo entry point. Selects one suite (PF_SUITE) from the registry
 *           in config/suites.js and builds its configuration for the active profile.
 *
 * Normally you do not call this directly - `npm run eval:*` runs every suite.
 * To run a single suite by hand:
 *   PF_SUITE=sensitive-info npx promptfoo eval
 */
'use strict';

const { resolveProfile } = require('./config/profiles');
const { buildConfig } = require('./config/build-config');
const { getSuite } = require('./config/suites');

const suite = getSuite(process.env.PF_SUITE || 'assertions');
const profile = resolveProfile(process.env.PF_PROFILE);

module.exports = buildConfig(suite, profile);
