import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { PricebookFormValues, UnitOption } from '@/types';

interface ItemFormProps {
  mode: 'create' | 'edit';
  initialValues: PricebookFormValues;
  unitOptions: UnitOption[];
  onSubmit: (values: PricebookFormValues) => Promise<void> | void;
  onCancel?: () => void;
  validationErrors?: Partial<Record<keyof PricebookFormValues, string>>;
}

const emptyErrors: Partial<Record<keyof PricebookFormValues, string>> = {};

const fieldLabels: Record<keyof PricebookFormValues, string> = {
  articleName: 'Article name',
  unit: 'Unit',
  unitPrice: 'Unit cost (PHP)',
  salePrice: 'Sale price (PHP)'
};

export const ItemForm = ({
  mode,
  initialValues,
  unitOptions,
  onSubmit,
  onCancel,
  validationErrors
}: ItemFormProps) => {
  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const errors = validationErrors ?? emptyErrors;

  const submitLabel = useMemo(() => (mode === 'edit' ? 'Update item' : 'Add to pricebook'), [mode]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit(values);
  };

  return (
    <form className="item-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        {(
          [
            ['articleName', 'text'],
            ['unit', 'select'],
            ['unitPrice', 'number'],
            ['salePrice', 'number']
          ] as const
        ).map(([name, type]) => (
          <label key={name} className="field">
            <span>{fieldLabels[name]}</span>
            {type === 'select' ? (
              <select name={name} value={values[name]} onChange={handleChange}>
                {unitOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                name={name}
                value={values[name]}
                onChange={handleChange}
                min={type === 'number' ? '0' : undefined}
                step={type === 'number' ? '0.01' : undefined}
                placeholder={fieldLabels[name]}
              />
            )}
            {errors[name] ? <span className="error">{errors[name]}</span> : null}
          </label>
        ))}
      </div>

      <div className="form-actions">
        <button type="submit" className="primary">
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="ghost">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
};
