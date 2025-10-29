import type { PricebookItem } from '@/types';

interface SummaryCardsProps {
  count: number;
  averageMargin: number;
  highestMargin: null | { item: PricebookItem; margin: number };
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(value);

export const SummaryCards = ({ count, averageMargin, highestMargin }: SummaryCardsProps) => (
  <section className="summary-grid">
    <article>
      <h3>Catalogued items</h3>
      <p className="value">{count}</p>
      <p className="hint">Total number of entries in your pricebook.</p>
    </article>
    <article>
      <h3>Average margin</h3>
      <p className="value">{count > 0 ? formatCurrency(averageMargin) : '—'}</p>
      <p className="hint">Average peso margin between sale price and unit cost.</p>
    </article>
    <article>
      <h3>Top performer</h3>
      {highestMargin ? (
        <>
          <p className="value">{highestMargin.item.articleName}</p>
          <p className="hint">
            Margin of {formatCurrency(highestMargin.margin)} (
            {highestMargin.item.unitPrice > 0
              ? ((highestMargin.margin / highestMargin.item.unitPrice) * 100).toFixed(1)
              : '0.0'}
            %)
          </p>
        </>
      ) : (
        <>
          <p className="value">—</p>
          <p className="hint">Add more items to see the best selling product.</p>
        </>
      )}
    </article>
  </section>
);
