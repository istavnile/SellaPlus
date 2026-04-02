export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  sellBy: 'UNIT' | 'WEIGHT';
  basePrice: number;
  costPrice: number;
  trackStock: boolean;
  stockAlertThreshold?: number;
  isActive: boolean;
  categoryId?: string;
  category?: Category;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
}

export interface ProductVariant {
  id: string;
  sku?: string;
  barcode?: string;
  priceOverride?: number;
  stockQty: number;
  isActive: boolean;
  optionValues: VariantOptionValue[];
}

export interface VariantOptionValue {
  optionValueId: string;
  optionValue: { value: string; option: { name: string } };
}

export interface Customer {
  id: string;
  customerCode?: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  customer?: Customer;
  items: TransactionItem[];
  payments: Payment[];
}

export interface TransactionItem {
  id: string;
  productName: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  method: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  amount: number;
  cashTendered?: number;
  changeGiven?: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';
}
