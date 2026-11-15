const message =
  'Analysis text comes from an AI and third party documents: render it as text, never as HTML.';

const restricted = [
  "JSXAttribute[name.name='dangerouslySetInnerHTML']",
  "Property[key.name='dangerouslySetInnerHTML']",
  'MemberExpression[property.name=/^(innerHTML|outerHTML|srcdoc)$/]',
  'CallExpression[callee.property.name=/^(insertAdjacentHTML|createContextualFragment|setHTMLUnsafe|parseHTMLUnsafe)$/]',
  "CallExpression[callee.object.name='document'][callee.property.name=/^(write|writeln)$/]",
  "NewExpression[callee.name='DOMParser']",
  "JSXAttribute[name.name='srcDoc']",
];

export const unsafeHtml = {
  files: ['apps/frontend/**'],
  rules: {
    'no-restricted-syntax': ['error', ...restricted.map((selector) => ({ selector, message }))],
  },
};
