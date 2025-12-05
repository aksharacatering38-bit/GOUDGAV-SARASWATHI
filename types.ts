
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  available: boolean;
  category: string;
  isVeg: boolean;
  rating?: number;
  votes?: number;
  isBestseller?: boolean;
}

export interface Banner {
  id: string;
  imageUrl: string;
  active: boolean;
  title?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface UserDetails {
  name: string;
  phone: string;
  address: string;
  email?: string;
  deliveryInstructions?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface UserProfile extends UserDetails {
  id: string; // usually the phone number
  joinedAt: number;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface Order {
  id: string;
  items: CartItem[];
  totalAmount: number;
  userDetails: UserDetails;
  status: OrderStatus;
  timestamp: number;
  paymentId?: string;
}

export interface AppState {
  view: 'LOGIN' | 'HOME' | 'CART' | 'CHECKOUT' | 'SUCCESS' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD';
  cart: CartItem[];
  menu: MenuItem[];
  orders: Order[];
  banners: Banner[];
  adminPin: string;
  lastOrderCheck: number;
  currentUser: UserProfile | null;
}

export const INITIAL_PIN = "2009"; // Default PIN

// Razorpay Type Definition
declare global {
  interface Window {
    Razorpay: any;
  }
}
