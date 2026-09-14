/**
 * Function-based lint-staged config, not the plain object/array form this
 * used to be in package.json's `lint-staged` field.
 *
 * Windows' cmd.exe has a hard ~8191-character command-line length limit.
 * With enough staged files, lint-staged's default behavior of passing every
 * matched file to one `eslint --fix`/`prettier --write` invocation can blow
 * past that ("The command line is too long."), killing the whole pre-commit
 * hook. Batching the file list into small groups keeps every invocation
 * well under the limit no matter how many files are staged at once.
 */
const MAX_FILES_PER_BATCH = 20;

/** Splits `files` into arrays of at most `MAX_FILES_PER_BATCH` entries. */
function chunk(files) {
  const batches = [];
  for (let i = 0; i < files.length; i += MAX_FILES_PER_BATCH) {
    batches.push(files.slice(i, i + MAX_FILES_PER_BATCH));
  }
  return batches;
}

/** Quotes each path so ones containing spaces still work as one argument. */
function quote(files) {
  return files.map((file) => JSON.stringify(file)).join(' ');
}

module.exports = {
  '*.{js,jsx,cjs,mjs,ts,tsx}': (files) =>
    chunk(files).map((batch) => `eslint --fix ${quote(batch)}`),
  '*.{js,jsx,cjs,mjs,ts,tsx,json,md,yml,yaml,css}': (files) =>
    chunk(files).map((batch) => `prettier --write ${quote(batch)}`),
};
