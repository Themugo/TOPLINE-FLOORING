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

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  useEffect(() => {
    let savedCart: string | null = null;
    try {
      savedCart = localStorage.getItem('flooring_app_cart');
    } catch {
      // storage unavailable (private mode, blocked cookies) - start empty
      return;
    }
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', items });
      } catch {
        try {
          localStorage.removeItem('flooring_app_cart');
        } catch {
          // ignore storage failures
        }
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('flooring_app_cart', JSON.stringify(state.items));
    } catch {
      // storage unavailable - skip persisting cart
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
