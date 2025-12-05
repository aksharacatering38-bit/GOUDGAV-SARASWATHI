
import { MenuItem } from './types';

// IMPORTANT: Replace this with your actual Razorpay Key ID from the Dashboard
// It usually starts with 'rzp_test_' or 'rzp_live_'
export const RAZORPAY_KEY_ID = "rzp_live_RnSm47ymDxiKnm"; 

export const INITIAL_MENU: MenuItem[] = [
  {
    id: '1',
    name: 'Cholle Puri',
    price: 80,
    description: 'Classic Punjabi style spicy chickpeas served with fluffy fried bread. A perfect evening snack.',
    imageUrl: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?q=80&w=800&auto=format&fit=crop',
    available: true,
    category: 'Recommended',
    isVeg: true,
    rating: 4.5,
    votes: 128,
    isBestseller: true
  },
  {
    id: '2',
    name: 'Aloo Paratha (3pc)',
    price: 100,
    description: 'Golden flatbread stuffed with spiced mashed potatoes, served with fresh curd and pickle.',
    imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?q=80&w=800&auto=format&fit=crop',
    available: true,
    category: 'Breads',
    isVeg: true,
    rating: 4.3,
    votes: 85,
    isBestseller: true
  },
  {
    id: '3',
    name: 'Jawar Roti (2pc)',
    price: 30,
    description: 'Traditional healthy sorghum flatbread, handmade and gluten-free. Best with spicy curries.',
    imageUrl: 'https://cdn.pixabay.com/photo/2023/09/24/14/05/bread-8273030_1280.jpg',
    available: true,
    category: 'Breads',
    isVeg: true,
    rating: 4.0,
    votes: 42
  },
  {
    id: '4',
    name: 'Ashirwad Chapathi (2pc)',
    price: 30,
    description: 'Soft and fluffy whole wheat chapathis made home-style without oil.',
    imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=800&auto=format&fit=crop',
    available: true,
    category: 'Breads',
    isVeg: true,
    rating: 4.1,
    votes: 56
  },
  {
    id: '5',
    name: 'Special Veg Curry',
    price: 80,
    description: 'Seasonal mixed vegetables cooked in a rich, aromatic tomato and onion gravy.',
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop',
    available: true,
    category: 'Curries',
    isVeg: true,
    rating: 4.2,
    votes: 94
  }
];

export const CATEGORY_IMAGES: Record<string, string> = {
  'Recommended': 'https://img.freepik.com/premium-photo/indian-hindu-veg-thali-food-platter-selective-focus_466689-35929.jpg',
  'Breads': 'https://t3.ftcdn.net/jpg/04/41/20/18/360_F_441201852_XQq4sQ5zZ8gF8j3K7X1X8z8X8z8X8z8.jpg', 
  'Curries': 'https://t4.ftcdn.net/jpg/06/03/92/29/360_F_603922929_6X0X0X0X0X0X0X0X0X0X0X0X0X0X0X0.jpg',
  'Other': 'https://cdn-icons-png.flaticon.com/512/706/706164.png'
};

export const COUPONS = [
  { code: 'WELCOME50', discountPercent: 50, maxDiscount: 100, minOrder: 150, description: '50% off up to ₹100' },
  { code: 'TIFFIN20', discountAmount: 20, minOrder: 200, description: 'Flat ₹20 off on orders above ₹200' }
];

export const CUTOFF_HOUR = 18; // 6 PM
export const DELIVERY_TIME = "8 PM";
export const STORE_NAME = "SARASWATHI TIFFINS";
export const RAZORPAY_LINK = "razorpay.me/@goudgavsaraswathi";
