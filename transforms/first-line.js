/**
 * Author  : Anil Kalisetti
 * File    : transforms/first-line.js
 * Purpose : Keep only the first line of a model answer, without trailing
 *           punctuation. Used before storing an output for a dependent test so
 *           the next prompt receives a clean value (for example a category name).
 */
'use strict';

module.exports = (output) =>
  String(output ?? '')
    .trim()
    .split('\n')[0]
    .trim()
    .replace(/[.!]+$/, '');
