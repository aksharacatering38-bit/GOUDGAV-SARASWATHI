
import React, { useState, useEffect } from 'react';
import { ChefHat, Mail, Check, ShoppingBag, User } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import Menu from './components/Menu';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import Admin from './components/Admin';
import Login from './components/Login';
import MyOrders from './components/MyOrders';
import { AppState, CartItem, MenuItem, Order, OrderStatus, UserDetails, UserProfile } from './types';
import * as Store from './services/store';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<AppState['view'] | 'MY_ORDERS'>('LOGIN');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  
  // Secret Admin Access State
  const [logoClickCount, setLogoClickCount] = useState(0);

  // Initial Load - Runs ONLY ONCE when app starts
  useEffect(() => {
    // Check for logged in user
    const savedUser = Store.getCurrentUser();
    if (savedUser) {
      setCurrentUser(savedUser);
      setView('HOME');
    }
    setMenu(Store.getMenu());
    
    // Request Notification Permissions
    LocalNotifications.requestPermissions();
  }, []);

  // --- REALTIME ORDER NOTIFICATIONS ---
  useEffect(() => {
    if (!currentUser) return;

    // Listen for updates to the 'orders' table
    const subscription = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;
          const oldOrder = payload.old as Order;

          // 1. Check if this order belongs to the current user
          // Note: payload.new.userDetails is JSONB, so we access it directly
          if (newOrder.userDetails && (newOrder.userDetails as any).phone === currentUser.phone) {
            
            // 2. Check if status changed
            if (newOrder.status !== oldOrder.status) {
              triggerStatusNotification(newOrder);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentUser]);

  const triggerStatusNotification = async (order: Order) => {
    let title = "Order Update";
    let body = `Your order status has changed to ${order.status}`;

    switch (order.status) {
      case OrderStatus.CONFIRMED:
        title = "Order Confirmed! 🍳";
        body = "We've received your order and are preparing it.";
        break;
      case OrderStatus.DELIVERED:
        title = "Order Delivered! 😋";
        body = "Your tiffins have been delivered. Enjoy your meal!";
        break;
      case OrderStatus.CANCELLED:
        title = "Order Cancelled ❌";
        body = "Your order was cancelled. Please contact support if this was a mistake.";
        break;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 100000), // Unique ID
          schedule: { at: new Date(Date.now() + 100) }, // Immediate
          sound: undefined,
          attachments: undefined,
          actionTypeId: "",
          extra: null
        }
      ]
    });
    
    // Also vibrate
    Haptics.notification({ type: NotificationType.Success });
  };
  // -------------------------------------

  // Handle Android Hardware Back Button - Dependent on view state
  useEffect(() => {
    const backButtonListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (view === 'HOME' && !showPinModal) {
        CapacitorApp.exitApp();
      } else if (view === 'LOGIN') {
        CapacitorApp.exitApp();
      } else if (showPinModal) {
        setShowPinModal(false);
      } else if (view !== 'HOME') {
        setView('HOME');
      } else {
        // Fallback
        if (canGoBack) {
          window.history.back();
        }
      }
    });

    return () => {
      backButtonListener.then(handler => handler.remove());
    };
  }, [view, showPinModal]); 

  // Secret Access Logic: Reset count if inactive for 2 seconds
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (logoClickCount > 0) {
      timer = setTimeout(() => setLogoClickCount(0), 2000);
    }
    
    if (logoClickCount >= 5) {
      setShowPinModal(true);
      setLogoClickCount(0);
    }

    return () => clearTimeout(timer);
  }, [logoClickCount]);

  const handleLogoClick = () => {
    setLogoClickCount(prev => prev + 1);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    Store.saveCurrentUser(user);
    setCurrentUser(user);
    setView('HOME');
  };

  const handleLogout = () => {
    Store.logoutUser();
    setCurrentUser(null);
    setView('LOGIN');
  };

  // Sync menu changes if admin updates it elsewhere
  const refreshMenu = (newMenu: MenuItem[]) => {
      setMenu(newMenu);
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity: Math.max(0, item.quantity + delta) };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handlePlaceOrder = async (details: UserDetails, paymentId: string) => {
    const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const itemTotal = total;
    const platformFee = 5;
    const deliveryFee = Store.getDeliveryFee();
    const gst = Math.round(itemTotal * 0.05);
    const finalTotal = itemTotal + platformFee + deliveryFee + gst;

    // Use New Generator for ID
    const newOrder: Order = {
      id: Store.generateOrderId(),
      items: cart,
      totalAmount: finalTotal,
      userDetails: details,
      status: OrderStatus.PENDING,
      timestamp: Date.now(),
      paymentId: paymentId
    };

    Store.saveOrder(newOrder);
    Store.saveLastOrder(cart);

    // Haptics for Success
    try {
        await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {}
    
    // Schedule "Miss You" Notification (48 hours later)
    try {
      await LocalNotifications.schedule({
        notifications: [{
          title: "Miss you! 🥺",
          body: "It's been 2 days... Fresh tiffins are ready!",
          id: 999,
          schedule: { at: new Date(Date.now() + 48 * 60 * 60 * 1000) }
        }]
      });
    } catch(e) {}

    setCart([]);
    setView('SUCCESS');
    
    // Open WhatsApp with Order Details
    const message = `*New Order: ${newOrder.id}*
Name: ${details.name}
Phone: ${details.phone}
Address: ${details.address}
Items:
${cart.map(i => `- ${i.quantity} x ${i.name}`).join('\n')}
Total: ₹${finalTotal}
Payment ID: ${paymentId}`;
    
    const whatsappUrl = `https://wa.me/919959730602?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === Store.getAdminPin()) {
        setShowPinModal(false);
        setPinInput('');
        setView('ADMIN_DASHBOARD');
    } else {
        alert('Incorrect PIN');
    }
  };

  const cartItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  // View Routing
  if (view === 'LOGIN') {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (view === 'SUCCESS') {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in pt-[safe-area-inset-top]">
        <div className="bg-green-100 p-6 rounded-full mb-6 relative">
          <ChefHat size={64} className="text-green-600" />
          <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full border-4 border-green-50">
             <Check size={20} />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Order Confirmed!</h2>
        <p className="text-gray-600 mb-6">
          Thank you. Your homemade tiffins will be delivered by 8 PM.
        </p>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100 mb-8 max-w-xs w-full">
            <div className="flex items-center gap-3 text-left mb-2">
                <div className="bg-green-100 p-2 rounded-full">
                    <Mail size={16} className="text-green-600" />
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-800">Confirmation Sent</p>
                    <p className="text-xs text-gray-500">You will receive notifications on status updates.</p>
                </div>
            </div>
        </div>

        <button
          onClick={() => setView('HOME')}
          className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-200"
        >
          Place Another Order
        </button>
      </div>
    );
  }

  if (view === 'ADMIN_DASHBOARD') {
      return <Admin onLogout={() => setView('HOME')} updateMenu={refreshMenu} />;
  }

  if (view === 'CART') {
    return <Cart cart={cart} updateQuantity={updateCartQuantity} goBack={() => setView('HOME')} checkout={() => setView('CHECKOUT')} />;
  }

  if (view === 'CHECKOUT') {
    const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const itemTotal = total;
    const platformFee = 5;
    const deliveryFee = Store.getDeliveryFee();
    const gst = Math.round(itemTotal * 0.05);
    const finalTotal = itemTotal + platformFee + deliveryFee + gst;

    return <Checkout total={finalTotal} currentUser={currentUser} goBack={() => setView('CART')} onPlaceOrder={handlePlaceOrder} />;
  }
  
  if (view === 'MY_ORDERS') {
    return <MyOrders currentUser={currentUser!} goBack={() => setView('HOME')} />;
  }

  // HOME View
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pt-[safe-area-inset-top]">
      {/* Header */}
      <header className="bg-white p-4 shadow-sm sticky top-0 z-20 flex justify-between items-center">
        {/* Profile Icon -> My Orders */}
        <div className="w-10 flex items-center justify-center">
            {currentUser && (
                <button onClick={() => setView('MY_ORDERS')} className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs shadow-sm active:scale-95 transition-transform">
                    {currentUser.name.charAt(0)}
                </button>
            )}
        </div>

        {/* Secret Admin Trigger: Click Logo 5 times */}
        <div 
          onClick={handleLogoClick}
          className="flex items-center gap-2 cursor-pointer select-none active:scale-95 transition-transform"
        >
            <ChefHat className="text-orange-500" />
            <h1 className="text-lg font-bold tracking-tight text-gray-800">SARASWATHI TIFFINS</h1>
        </div>

        {/* Cart Icon */}
        <button 
            onClick={() => setView('CART')}
            className="w-10 h-10 flex items-center justify-center text-gray-700 hover:text-orange-600 relative"
            aria-label="Cart"
        >
            <ShoppingBag size={24} />
            {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 bg-green-600 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce-slight">
                    {cartItemCount}
                </span>
            )}
        </button>
      </header>

      <Menu menu={menu} cart={cart} addToCart={addToCart} updateQuantity={updateCartQuantity} goToCart={() => setView('CART')} />
      
      {/* Admin Login Modal */}
      {showPinModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-xl font-bold mb-4 text-center">Admin Access</h3>
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                      <input 
                        autoFocus
                        type="password" 
                        maxLength={4}
                        placeholder="Enter PIN" 
                        className="w-full text-center text-2xl tracking-[0.5em] p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                        value={pinInput}
                        onChange={e => setPinInput(e.target.value)}
                      />
                      <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">Unlock</button>
                      <button type="button" onClick={() => setShowPinModal(false)} className="w-full py-2 text-gray-500 font-medium">Cancel</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
