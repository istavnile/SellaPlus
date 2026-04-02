import { create } from 'zustand';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  variantLabel?: string;
  sku?: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  taxRate: number;
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  globalDiscount: number;
  addItem: (item: Omit<CartItem, 'id' | 'quantity' | 'discountAmount'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setItemDiscount: (id: string, discount: number) => void;
  setCustomer: (customerId: string | null) => void;
  setGlobalDiscount: (discount: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  taxTotal: () => number;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  globalDiscount: 0,

  addItem: (newItem) => {
    const existing = get().items.find(
      (i) => i.productId === newItem.productId && i.variantId === newItem.variantId,
    );
    if (existing) {
      set((s) => ({
        items: s.items.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      }));
    } else {
      set((s) => ({
        items: [
          ...s.items,
          { ...newItem, id: crypto.randomUUID(), quantity: 1, discountAmount: 0 },
        ],
      }));
    }
  },

  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, quantity } : i)) }));
  },

  setItemDiscount: (id, discount) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, discountAmount: discount } : i)),
    })),

  setCustomer: (customerId) => set({ customerId }),
  setGlobalDiscount: (globalDiscount) => set({ globalDiscount }),
  clearCart: () => set({ items: [], customerId: null, globalDiscount: 0 }),

  subtotal: () =>
    get().items.reduce((sum, i) => sum + (i.unitPrice * i.quantity - i.discountAmount), 0),

  taxTotal: () =>
    get().items.reduce(
      (sum, i) => sum + (i.unitPrice * i.quantity - i.discountAmount) * i.taxRate,
      0,
    ),

  total: () => {
    const { subtotal, taxTotal, globalDiscount } = get();
    return subtotal() + taxTotal() - globalDiscount;
  },
}));
