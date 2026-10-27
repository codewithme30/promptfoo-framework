/**
 * Author  : Anil Kalisetti
 * File    : transforms/normalize-output.js
 * Purpose : Default output transform. Trims whitespace and, for short single-line
 *           answers, removes trailing punctuation so exact-match checks such as
 *           `equals` do not fail on "READY." vs "READY".
 */
'use strict';

const SHORT_ANSWER_MAX_LENGTH = 40;

module.exports = (output) => {
  if (typeof output !== 'string') return output;

  const text = output.trim();
  const isShortSingleLine = !text.includes('\n') && text.length <= SHORT_ANSWER_MAX_LENGTH;
  return isShortSingleLine ? text.replace(/[.!]+$/, '') : text;
};
