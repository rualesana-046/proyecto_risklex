import type { ESLint, Rule } from 'eslint';

export const noCommentsRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow every comment in source code' },
    schema: [],
    messages: {
      comment:
        'Comments are not allowed. Track pending work in docs/tasks.md or docs/tech-debt.md.',
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.loc) {
            context.report({ loc: comment.loc, messageId: 'comment' });
          }
        }
      },
    };
  },
};

export const localPlugin: ESLint.Plugin = {
  meta: { name: 'risklex-local' },
  rules: { 'no-comments': noCommentsRule },
};
