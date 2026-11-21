import type { GlossaryTerm } from '@risklex/shared';
import { useTranslation } from 'react-i18next';

export function Glossary({ terms }: { readonly terms: readonly GlossaryTerm[] }) {
  const { t } = useTranslation();
  if (terms.length === 0) {
    return null;
  }
  return (
    <section className="glossary" aria-labelledby="glossary-title">
      <h2 id="glossary-title">{t('results.glossary.title')}</h2>
      <dl className="glossary-list">
        {terms.map((term, index) => (
          <div key={`${String(index)}-${term.term}`} className="glossary-item">
            <dt>{term.term}</dt>
            <dd>{term.explanation}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
