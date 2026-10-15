import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Product, CartItem, ProductVariant } from '@/lib/types';

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; product: Product; quantity?: number; variant?: ProductVariant }
  | { type: 'REMOVE_ITEM'; productId: string; variantId?: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number; variantId?: string }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; items: CartItem[] };

interface CartContextValue {
  items: CartItem[];
  state: CartState;
  addItem: (product: Product, variant?: ProductVariant) => void;
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (productId: string, variant?: ProductVariant) => void;
  removeFromCart: (productId: string, variant?: ProductVariant) => void;
  updateQuantity: (productId: string, quantity: number, variant?: ProductVariant) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const qty = action.quantity ?? 1;
      const existingItem = state.items.find(
        (item) => item.product.id === action.product.id && item.variant?.id === action.variant?.id
      );
      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.product.id === action.product.id && item.variant?.id === action.variant?.id
              ? { ...item, quantity: item.quantity + qty }
              : item
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { product: action.product, quantity: qty, variant: action.variant }],
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => !(item.product.id === action.productId && item.variant?.id === action.variantId)),
      };
    case 'UPDATE_QUANTITY':
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (item) => !(item.product.id === action.productId && item.variant?.id === action.variantId)
          ),
        };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.product.id === action.productId && item.variant?.id === action.variantId
            ? { ...item, quantity: action.quantity }
            : item
        ),
      };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    case 'LOAD_CART':
      return { ...state, items: action.items };
    default:
      return state;
  }
}

function readSavedCart(): CartItem[] {
  try {
    const raw = localStorage.getItem('flooring_app_cart');
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Ignore malformed entries instead of allowing one bad local-storage value
    // to break the entire cart. This is client state, not inventory authority.
    return parsed.filter((entry: unknown): entry is CartItem => {
      if (!entry || typeof entry !== 'object') return false;
      const candidate = entry as Partial<CartItem>;
      const product = candidate.product;
      return Boolean(
        product && typeof product === 'object' &&
        typeof product.id === 'string' && typeof product.name === 'string' &&
        Number.isInteger(candidate.quantity) && (candidate.quantity ?? 0) > 0
      );
    });
  } catch {
    // Storage can be unavailable in private browsing or when browser policy blocks it.
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Hydrate synchronously before the first interactive render. Previously, the
  // initial empty state could be persisted while a saved cart was still loading,
  // making cart contents appear to disappear during navigation.
  const [state, dispatch] = useReducer(cartReducer, undefined, () => ({ items: readSavedCart() }));

  useEffect(() => {
    try {
      localStorage.setItem('flooring_app_cart', JSON.stringify(state.items));
    } catch {
      // Storage is best-effort; the in-memory cart remains usable for this session.
    }
  }, [state.items]);

  const addItem = (product: Product, variant?: ProductVariant) => {
    dispatch({ type: 'ADD_ITEM', product, variant });
  };

  const addToCart = (product: Product, quantity: number = 1, variant?: ProductVariant) => {
    dispatch({ type: 'ADD_ITEM', product, quantity, variant });
  };

  const removeItem = (productId: string, variant?: ProductVariant) => {
    dispatch({ type: 'REMOVE_ITEM', productId, variantId: variant?.id });
  };

  const updateQuantity = (productId: string, quantity: number, variant?: ProductVariant) => {
    dispatch({ type: 'UPDATE_QUANTITY', productId, quantity, variantId: variant?.id });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const totalPrice = state.items.reduce((total, item) => {
    const unitPrice = item.variant
      ? (item.variant.sale_price ?? item.product.price + (item.variant.price_adjustment || 0))
      : (item.product.sale_price ?? item.product.price);
    return total + unitPrice * item.quantity;
  }, 0);

  const totalItems = state.items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        state,
        addItem,
        addToCart,
        removeItem,
        removeFromCart: removeItem,
        updateQuantity,
        clearCart,
        totalPrice,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
