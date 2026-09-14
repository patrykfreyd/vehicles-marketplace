import { describe, expect, it } from 'vitest';
import { program } from './cli';

// Importing cli.ts must not run main() itself (no argv parsing, no DB
// connection) — see its own comment on the `isMainModule` guard. This is a
// thin smoke test that the six commands plans/09-catalogue-import-tooling-admin.md
// §5 asks for are actually registered; each command's own behavior is
// covered by its command/*.test.ts and lib/*.test.ts.
describe('catalogue CLI', () => {
  it('registers every command from §5', () => {
    const names = program.commands.map((command) => command.name());
    expect(names).toEqual(
      expect.arrayContaining([
        'validate',
        'import',
        'report',
        'completeness',
        'find-duplicates',
        'enrich',
      ]),
    );
  });
});
