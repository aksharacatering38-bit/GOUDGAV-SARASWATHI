
import { MenuItem, Order, INITIAL_PIN, CartItem, UserProfile, Banner } from '../types';
import { INITIAL_MENU, CATEGORY_IMAGES } from '../constants';

const KEYS = {
  MENU: 'st_menu',
  ORDERS: 'st_orders',
  PIN: 'st_admin_pin',
  DELIVERY_FEE: 'st_delivery_fee',
  LAST_ORDER: 'st_last_order',
  CURRENT_USER: 'st_current_user',
  BANNERS: 'st_banners',
  FAVORITES: 'st_favorites',
  CATEGORY_IMAGES: 'st_category_images'
};

export const getMenu = (): MenuItem[] => {
  const stored = localStorage.getItem(KEYS.MENU);
  return stored ? JSON.parse(stored) : INITIAL_MENU;
};

export const saveMenu = (menu: MenuItem[]) => {
  localStorage.setItem(KEYS.MENU, JSON.stringify(menu));
};

export const getOrders = (): Order[] => {
  const stored = localStorage.getItem(KEYS.ORDERS);
  let orders: Order[] = stored ? JSON.parse(stored) : [];
  
  // Cleanup old orders (> 60 days)
  const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const recentOrders = orders.filter(o => (now - o.timestamp) < SIXTY_DAYS_MS);
  
  if (recentOrders.length !== orders.length) {
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(recentOrders));
      orders = recentOrders;
  }
  
  return orders;
};

export const saveOrder = (order: Order) => {
  const orders = getOrders();
  // Add new order to the beginning
  const newOrders = [order, ...orders];
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(newOrders));
};

export const updateOrder = (updatedOrder: Order) => {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === updatedOrder.id);
  if (index !== -1) {
    orders[index] = updatedOrder;
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  }
};

export const getAdminPin = (): string => {
  return localStorage.getItem(KEYS.PIN) || INITIAL_PIN;
};

export const setAdminPin = (pin: string) => {
  localStorage.setItem(KEYS.PIN, pin);
};

export const getDeliveryFee = (): number => {
  const stored = localStorage.getItem(KEYS.DELIVERY_FEE);
  return stored ? Number(stored) : 0;
};

export const setDeliveryFee = (fee: number) => {
  localStorage.setItem(KEYS.DELIVERY_FEE, fee.toString());
};

export const saveLastOrder = (cart: CartItem[]) => {
  localStorage.setItem(KEYS.LAST_ORDER, JSON.stringify(cart));
};

export const getLastOrder = (): CartItem[] => {
  const stored = localStorage.getItem(KEYS.LAST_ORDER);
  return stored ? JSON.parse(stored) : [];
};

export const saveCurrentUser = (user: UserProfile) => {
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
};

export const getCurrentUser = (): UserProfile | null => {
  const stored = localStorage.getItem(KEYS.CURRENT_USER);
  return stored ? JSON.parse(stored) : null;
};

export const logoutUser = () => {
  localStorage.removeItem(KEYS.CURRENT_USER);
};

export const getBanners = (): Banner[] => {
  const stored = localStorage.getItem(KEYS.BANNERS);
  return stored ? JSON.parse(stored) : [];
};

export const saveBanners = (banners: Banner[]) => {
  localStorage.setItem(KEYS.BANNERS, JSON.stringify(banners));
};

// --- NEW FEATURES ---

export const generateOrderId = (): string => {
  // Generates ID like #ORD-8X29
  const randomPart = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `#ORD-${randomPart}`;
};

export const getFavorites = (): string[] => {
  const stored = localStorage.getItem(KEYS.FAVORITES);
  return stored ? JSON.parse(stored) : [];
};

export const toggleFavorite = (itemId: string): boolean => {
  const favorites = getFavorites();
  const index = favorites.indexOf(itemId);
  let newFavorites;
  let isAdded = false;

  if (index === -1) {
    newFavorites = [...favorites, itemId];
    isAdded = true;
  } else {
    newFavorites = favorites.filter(id => id !== itemId);
    isAdded = false;
  }
  
  localStorage.setItem(KEYS.FAVORITES, JSON.stringify(newFavorites));
  return isAdded;
};

export const getCategoryImages = (): Record<string, string> => {
  const stored = localStorage.getItem(KEYS.CATEGORY_IMAGES);
  // Merge stored images with defaults to ensure new categories get defaults if not overridden
  return stored ? { ...CATEGORY_IMAGES, ...JSON.parse(stored) } : CATEGORY_IMAGES;
};

export const saveCategoryImages = (images: Record<string, string>) => {
  localStorage.setItem(KEYS.CATEGORY_IMAGES, JSON.stringify(images));
};

export const createBackup = (): string => {
    const data = {
        menu: getMenu(),
        orders: getOrders(),
        banners: getBanners(),
        pin: getAdminPin(),
        deliveryFee: getDeliveryFee(),
        categoryImages: getCategoryImages(),
        timestamp: Date.now()
    };
    return JSON.stringify(data, null, 2);
};

export const restoreBackup = (jsonString: string): boolean => {
    try {
        const data = JSON.parse(jsonString);
        if (data.menu) saveMenu(data.menu);
        if (data.orders) localStorage.setItem(KEYS.ORDERS, JSON.stringify(data.orders));
        if (data.banners) saveBanners(data.banners);
        if (data.pin) setAdminPin(data.pin);
        if (data.deliveryFee !== undefined) setDeliveryFee(data.deliveryFee);
        if (data.categoryImages) saveCategoryImages(data.categoryImages);
        return true;
    } catch (e) {
        console.error("Restore failed", e);
        return false;
    }
};
