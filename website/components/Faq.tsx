export interface FaqItem {
  q: string;
  a: string;
}

/**
 * A question-and-answer block and its FAQPage schema, rendered from one
 * array. Written as literal questions with the answer first because that
 * is the shape answer engines lift: a question-form heading followed by a
 * short, complete answer, before any elaboration.
 *
 * Every question here must be one the page actually answers — FAQPage
 * markup describing questions the visible page does not carry is the
 * kind of structured data search engines discount wholesale.
 */
export function Faq({ items, heading = 'Questions' }: { items: FaqItem[]; heading?: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <section className="block">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h2>{heading}</h2>
      <dl className="facts">
        {items.map((item) => (
          <div key={item.q}>
            <dt>{item.q}</dt>
            <dd>{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
