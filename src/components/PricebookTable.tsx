import type { PricebookItem } from '@/types';

interface PricebookTableProps {
  items: PricebookItem[];
  onSelect: (item: PricebookItem) => void;
  onDelete: (id: string) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(value);

export const PricebookTable = ({ items, onSelect, onDelete }: PricebookTableProps) => {
  if (items.length === 0) {
    return <p className="empty-state">No items found. Add your first entry to build the pricebook.</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Article</th>
            <th>Unit</th>
            <th>Unit cost</th>
            <th>Sale price</th>
            <th>Margin</th>
            <th aria-label="actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const margin = item.salePrice - item.unitPrice;
            const marginPercent = item.unitPrice > 0 ? (margin / item.unitPrice) * 100 : 0;

            return (
              <tr key={item.id}>
                <td>
                  <button className="link" onClick={() => onSelect(item)}>
                    <span className="article-name">{item.articleName}</span>
                    <span className="meta">Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
                  </button>
                </td>
                <td>{item.unit}</td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td>{formatCurrency(item.salePrice)}</td>
                <td>
                  <span className={`pill ${margin >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(margin)} ({marginPercent.toFixed(1)}%)
                  </span>
                </td>
                <td>
                  <button className="danger" onClick={() => onDelete(item.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
