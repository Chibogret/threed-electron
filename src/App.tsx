import { useMemo, useState } from 'react';
import { ItemForm } from '@/components/ItemForm';
import { PricebookTable } from '@/components/PricebookTable';
import { SummaryCards } from '@/components/SummaryCards';
import { usePricebook } from '@/hooks/usePricebook';
import type { PricebookFormValues, PricebookItem } from '@/types';

const initialFormValues: PricebookFormValues = {
  articleName: '',
  unit: 'pcs',
  unitPrice: '',
  salePrice: ''
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(value);

const App = () => {
  const { items, unitOptions, createItem, updateItem, removeItem, summary } = usePricebook();
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [activeItem, setActiveItem] = useState<PricebookItem | null>(null);
  const [formValues, setFormValues] = useState<PricebookFormValues>(initialFormValues);
  const [errors, setErrors] = useState<Partial<Record<keyof PricebookFormValues, string>> | undefined>();
  const [query, setQuery] = useState('');

  const resetForm = () => {
    setFormMode('create');
    setActiveItem(null);
    setFormValues(initialFormValues);
    setErrors(undefined);
  };

  const handleSubmit = (values: PricebookFormValues) => {
    if (formMode === 'edit' && activeItem) {
      const result = updateItem(activeItem.id, values);
      if ('errors' in result) {
        setErrors(result.errors);
      } else {
        resetForm();
      }
      return;
    }

    const result = createItem(values);
    if ('errors' in result) {
      setErrors(result.errors);
    } else {
      resetForm();
    }
  };

  const handleSelect = (item: PricebookItem) => {
    setFormMode('edit');
    setActiveItem(item);
    setFormValues({
      articleName: item.articleName,
      unit: item.unit,
      unitPrice: item.unitPrice.toString(),
      salePrice: item.salePrice.toString()
    });
    setErrors(undefined);
  };

  const handleDelete = (id: string) => {
    if (activeItem?.id === id) {
      resetForm();
    }
    removeItem(id);
  };

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return items;

    return items.filter((item) =>
      [item.articleName, item.unit].some((value) => value.toLowerCase().includes(search))
    );
  }, [items, query]);

  const inventoryValue = useMemo(
    () =>
      filteredItems.reduce(
        (acc, item) => ({
          cost: acc.cost + item.unitPrice,
          sale: acc.sale + item.salePrice
        }),
        { cost: 0, sale: 0 }
      ),
    [filteredItems]
  );

  return (
    <div className="app-shell">
      <header>
        <div>
          <h1>Hardware Supplies Pricebook</h1>
          <p className="tagline">Track unit cost and sale pricing in one focused workspace.</p>
        </div>
        <div className="totals">
          <div>
            <span>Combined unit cost</span>
            <strong>{formatCurrency(inventoryValue.cost)}</strong>
          </div>
          <div>
            <span>Combined sale value</span>
            <strong>{formatCurrency(inventoryValue.sale)}</strong>
          </div>
        </div>
      </header>

      <main>
        <section className="panel form-panel">
          <h2>{formMode === 'edit' ? 'Update pricebook entry' : 'Add a new item'}</h2>
          <ItemForm
            mode={formMode}
            initialValues={formValues}
            unitOptions={unitOptions}
            onSubmit={handleSubmit}
            onCancel={formMode === 'edit' ? resetForm : undefined}
            validationErrors={errors}
          />
        </section>

        <section className="panel list-panel">
          <div className="panel-header">
            <div>
              <h2>Pricebook</h2>
              <p>Search and manage your item pricing catalogue.</p>
            </div>
            <div className="search">
              <input
                type="search"
                placeholder="Search by article name or unit"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <SummaryCards {...summary} />

          <PricebookTable items={filteredItems} onSelect={handleSelect} onDelete={handleDelete} />
        </section>
      </main>

      <footer>
        <small>
          Running on Electron {window.appBridge.versions.electron}. Data is saved locally on this device.
        </small>
      </footer>
    </div>
  );
};

export default App;
