import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noCommentsRule } from './no-comments.ts';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  linterOptions: { noInlineConfig: true },
});

const commentError = { messageId: 'comment' };

ruleTester.run('no-comments', noCommentsRule, {
  valid: [
    { code: 'const total = 1 + 2;' },
    { code: "const url = 'https://example.com/path';" },
    { code: "const text = '// not a comment';" },
    { code: 'const pattern = /\\/\\*/u;' },
  ],
  invalid: [
    { code: '// line comment\nconst a = 1;', errors: [commentError] },
    { code: '/* block comment */ const a = 1;', errors: [commentError] },
    { code: '/** doc comment */\nexport const a = 1;', errors: [commentError] },
    { code: 'const a = 1;\n// TODO: later', errors: [commentError] },
    {
      code: '/* eslint-disable */\nconst a = 1;',
      errors: [
        {
          message:
            "'/* eslint-disable */' has no effect because you have 'noInlineConfig' setting in your config.",
        },
        commentError,
      ],
    },
    { code: '// one\n// two\nconst a = 1;', errors: [commentError, commentError] },
  ],
});
