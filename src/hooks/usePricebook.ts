import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PricebookFormValues, PricebookItem, UnitOption } from '@/types';

const STORAGE_KEY = 'hardware-supplies-pricebook';

const unitOptions: UnitOption[] = [
  'pcs',
  'box',
  'bag',
  'kg',
  'm',
  'length',
  'roll',
  'set',
  'pair',
  'tin',
  'gal',
  'lot'
];

const defaultItems: PricebookItem[] = [
  {
    id: 'itm-001',
    articleName: 'Concrete Nails 2\"',
    unit: 'box',
    unitPrice: 120,
    salePrice: 150,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'itm-002',
    articleName: 'PVC Pipe 1/2\" Schedule 40',
    unit: 'length',
    unitPrice: 85,
    salePrice: 120,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'itm-003',
    articleName: 'Industrial Gloves',
    unit: 'pair',
    unitPrice: 60,
    salePrice: 95,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

type ValidationErrors = Partial<Record<keyof PricebookFormValues, string>>;

const validate = (values: PricebookFormValues): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!values.articleName.trim()) {
    errors.articleName = 'Article name is required.';
  }

  if (!unitOptions.includes(values.unit)) {
    errors.unit = 'Select a valid unit.';
  }

  const unitPrice = Number(values.unitPrice);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    errors.unitPrice = 'Unit cost must be a positive number.';
  }

  const salePrice = Number(values.salePrice);
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    errors.salePrice = 'Sale price must be a positive number.';
  }

  if (Number.isFinite(unitPrice) && Number.isFinite(salePrice) && salePrice < unitPrice) {
    errors.salePrice = 'Sale price should not be lower than cost.';
  }

  return errors;
};

const generateId = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `item-${Math.random().toString(36).slice(2, 10)}`;

const parseValues = (values: PricebookFormValues): PricebookItem => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    articleName: values.articleName.trim(),
    unit: values.unit,
    unitPrice: Number(values.unitPrice),
    salePrice: Number(values.salePrice),
    createdAt: now,
    updatedAt: now
  };
};

const serializeItems = (items: PricebookItem[]) => JSON.stringify(items);

const deserializeItems = (raw: string | null): PricebookItem[] => {
  if (!raw) return defaultItems;

  try {
    const parsed: PricebookItem[] = JSON.parse(raw);
    return parsed.map((item) => ({
      ...item,
      createdAt: item.createdAt ?? new Date().toISOString(),
      updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString()
    }));
  } catch (error) {
    console.warn('Failed to parse stored pricebook data:', error);
    return defaultItems;
  }
};

export const usePricebook = () => {
  const [items, setItems] = useState<PricebookItem[]>([]);

  useEffect(() => {
    setItems(deserializeItems(window.localStorage.getItem(STORAGE_KEY)));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, serializeItems(items));
  }, [items]);

  const upsertItem = useCallback((item: PricebookItem) => {
    setItems((current) => {
      const existingIndex = current.findIndex((existing) => existing.id === item.id);
      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = { ...item, updatedAt: new Date().toISOString() };
        return updated;
      }

      return [...current, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const createItem = useCallback((values: PricebookFormValues) => {
    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      return { errors } as const;
    }

    const item = parseValues(values);
    upsertItem(item);
    return { item } as const;
  }, [upsertItem]);

  const updateItem = useCallback((id: string, values: PricebookFormValues) => {
    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      return { errors } as const;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              articleName: values.articleName.trim(),
              unit: values.unit,
              unitPrice: Number(values.unitPrice),
              salePrice: Number(values.salePrice),
              updatedAt: new Date().toISOString()
            }
          : item
      )
    );

    return { id } as const;
  }, []);

  const summary = useMemo(() => {
    if (items.length === 0) {
      return {
        count: 0,
        averageMargin: 0,
        highestMargin: null as null | { item: PricebookItem; margin: number }
      };
    }

    const margins = items.map((item) => ({
      item,
      margin: item.salePrice - item.unitPrice
    }));

    const totalMargin = margins.reduce((acc, { margin }) => acc + margin, 0);
    const highestMargin = margins.reduce((acc, current) => {
      if (!acc || current.margin > acc.margin) {
        return current;
      }
      return acc;
    }, null as null | { item: PricebookItem; margin: number });

    return {
      count: items.length,
      averageMargin: totalMargin / items.length,
      highestMargin
    };
  }, [items]);

  return {
    items,
    unitOptions,
    createItem,
    updateItem,
    removeItem,
    summary
  };
};

export type UsePricebook = ReturnType<typeof usePricebook>;
