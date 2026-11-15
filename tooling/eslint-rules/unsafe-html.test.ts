import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({
  overrideConfig: [tseslint.configs.disableTypeChecked],
});

async function unsafeHtmlCount(code: string): Promise<number> {
  const [result] = await eslint.lintText(code, {
    filePath: 'apps/frontend/src/renderer/src/sample.tsx',
  });
  const messages = result?.messages ?? [];
  return messages.filter((message) => message.ruleId === 'no-restricted-syntax').length;
}

describe('unsafe html rule', () => {
  it.each([
    'export const a = <div dangerouslySetInnerHTML={{ __html: text }} />;',
    'export const a = createElement("div", { dangerouslySetInnerHTML: { __html: text } });',
    'element.innerHTML = text;',
    'element.outerHTML = text;',
    'frame.srcdoc = text;',
    'export const a = <iframe srcDoc={text} />;',
    'element.insertAdjacentHTML("beforeend", text);',
    'range.createContextualFragment(text);',
    'element.setHTMLUnsafe(text);',
    'document.write(text);',
    'document.writeln(text);',
    'export const parser = new DOMParser();',
  ])('blocks %s', async (code) => {
    expect(await unsafeHtmlCount(code)).toBe(1);
  });

  it.each([
    'export const a = <p>{text}</p>;',
    'element.textContent = text;',
    'export const a = <blockquote cite="x">{quote}</blockquote>;',
  ])('allows rendering as text: %s', async (code) => {
    expect(await unsafeHtmlCount(code)).toBe(0);
  });
});
