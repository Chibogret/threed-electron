export type UnitOption =
  | 'pcs'
  | 'box'
  | 'bag'
  | 'kg'
  | 'm'
  | 'length'
  | 'roll'
  | 'set'
  | 'pair'
  | 'tin'
  | 'gal'
  | 'lot';

export interface PricebookItem {
  id: string;
  articleName: string;
  unit: UnitOption;
  unitPrice: number;
  salePrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface PricebookFormValues {
  articleName: string;
  unit: UnitOption;
  unitPrice: string;
  salePrice: string;
}
