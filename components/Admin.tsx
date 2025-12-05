
import React, { useState, useEffect, useRef } from 'react';
import { Package, Menu as MenuIcon, Settings, X, Bell, Upload, Image as ImageIcon, Volume2, CheckCircle, Edit2, Trash, Plus, Search, RefreshCw, AlertTriangle, MapPin, Phone, Calendar, History as HistoryIcon, User, Lock, ToggleLeft, ToggleRight, LayoutDashboard, TrendingUp, DollarSign, ShoppingCart, Navigation } from 'lucide-react';
import { Order, MenuItem, OrderStatus, Banner, UserDetails } from '../types';
import * as Store from '../services/store';

interface AdminProps {
  onLogout: () => void;
  updateMenu: (newMenu: MenuItem[]) => void;
}

const Admin: React.FC<AdminProps> = ({ onLogout, updateMenu }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ORDERS' | 'MENU' | 'SETTINGS' | 'HISTORY' | 'BANNERS'>('DASHBOARD');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ordersRef = useRef<Order[]>([]); 
  
  // Notification Queue System
  const [notificationQueue, setNotificationQueue] = useState<Order[]>([]);
  const [activeNotification, setActiveNotification] = useState<Order | null>(null);
  
  // Settings State
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [adminPin, setAdminPin] = useState('');
  
  // Menu Editing State
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category Images State
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});

  // History Filter State
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Banner Editing State
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Map Modal State
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<UserDetails | null>(null);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.preload = 'auto';
    
    refreshData();
    
    const interval = setInterval(checkForNewOrders, 30000); 

    const handleStorage = (e: StorageEvent) => {
        if (e.key === 'st_orders') {
            checkForNewOrders();
        }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Queue Processor
  useEffect(() => {
    if (notificationQueue.length > 0 && !activeNotification) {
      const nextOrder = notificationQueue[0];
      setNotificationQueue(prev => prev.slice(1));
      setActiveNotification(nextOrder);
      playNotificationSound();
      const timer = setTimeout(() => {
        setActiveNotification(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [notificationQueue, activeNotification]);

  const refreshData = () => {
    const latestOrders = Store.getOrders();
    setOrders(latestOrders);
    ordersRef.current = latestOrders; // Sync Ref
    setMenu(Store.getMenu());
    setBanners(Store.getBanners());
    setDeliveryFee(Store.getDeliveryFee());
    setAdminPin(Store.getAdminPin());
    setCategoryImages(Store.getCategoryImages());
  };

  const checkForNewOrders = () => {
    const latestOrders = Store.getOrders();
    const prevOrders = ordersRef.current;

    const newOrders = latestOrders.filter(
      latest => !prevOrders.some(prev => prev.id === latest.id)
    );

    if (newOrders.length > 0) {
      setNewOrderCount(count => count + newOrders.length);
      setNotificationQueue(prevQueue => [...prevQueue, ...newOrders]);
      setOrders(latestOrders);
      ordersRef.current = latestOrders;
    } else if (latestOrders.length !== prevOrders.length) {
      setOrders(latestOrders);
      ordersRef.current = latestOrders;
    }
  };

  const playNotificationSound = () => {
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => {
            console.log('Audio play failed - user interaction needed', e);
        });
    }
  };

  const handleStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const updated = { ...order, status: newStatus };
      Store.updateOrder(updated);
      refreshData();
    }
  };

  const openMap = (details: UserDetails) => {
      setSelectedLocation(details);
      setShowMapModal(true);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 500;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                } else {
                    reject(new Error("Canvas context failed"));
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editingItem) {
        const file = e.target.files[0];
        try {
            const compressedBase64 = await compressImage(file);
            setEditingItem({ ...editingItem, imageUrl: compressedBase64 });
        } catch (error) {
            alert("Error uploading image. Please try another file.");
        }
    }
  };

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          try {
              const compressedBase64 = await compressImage(file);
              const updatedImages = { ...categoryImages, [category]: compressedBase64 };
              Store.saveCategoryImages(updatedImages);
              setCategoryImages(updatedImages);
          } catch (error) {
              alert("Error uploading category image.");
          }
      }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          try {
              const compressedBase64 = await compressImage(file);
              setNewBannerUrl(compressedBase64);
          } catch (error) {
              alert("Error uploading banner.");
          }
      }
  };

  const handleAddBanner = () => {
      if (!newBannerUrl) return;
      const newBanner: Banner = {
          id: Date.now().toString(),
          imageUrl: newBannerUrl,
          active: true,
          title: 'Promo'
      };
      const updatedBanners = [...banners, newBanner];
      Store.saveBanners(updatedBanners);
      setBanners(updatedBanners);
      setNewBannerUrl('');
  };

  const toggleBanner = (id: string) => {
      const updatedBanners = banners.map(b => b.id === id ? { ...b, active: !b.active } : b);
      Store.saveBanners(updatedBanners);
      setBanners(updatedBanners);
  };

  const deleteBanner = (id: string) => {
      const updatedBanners = banners.filter(b => b.id !== id);
      Store.saveBanners(updatedBanners);
      setBanners(updatedBanners);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    let newMenu = [...menu];
    if (editingItem.id === 'new') {
        const newItem = { ...editingItem, id: Date.now().toString() };
        newMenu.push(newItem);
    } else {
        const index = newMenu.findIndex(i => i.id === editingItem.id);
        if (index !== -1) newMenu[index] = editingItem;
    }

    Store.saveMenu(newMenu);
    updateMenu(newMenu);
    setMenu(newMenu);
    setIsFormOpen(false);
    setEditingItem(null);
  };

  // Quick Toggle Stock directly from List
  const toggleItemStock = (id: string, currentStatus: boolean) => {
    const newMenu = menu.map(item => item.id === id ? { ...item, available: !currentStatus } : item);
    Store.saveMenu(newMenu);
    updateMenu(newMenu);
    setMenu(newMenu);
  };

  const handleDeleteItem = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
        const newMenu = menu.filter(i => i.id !== deleteId);
        Store.saveMenu(newMenu);
        updateMenu(newMenu);
        setMenu(newMenu);
        setDeleteId(null);
    }
  };

  const handleSaveSettings = () => {
      Store.setDeliveryFee(deliveryFee);
      Store.setAdminPin(adminPin);
      alert('Settings saved successfully!');
  };

  const getDashboardStats = () => {
    const today = new Date().setHours(0,0,0,0);
    const todaysOrders = orders.filter(o => new Date(o.timestamp).setHours(0,0,0,0) === today);
    const totalSales = todaysOrders.reduce((acc, o) => acc + o.totalAmount, 0);
    
    // Find top item
    const itemCounts: Record<string, number> = {};
    orders.forEach(o => {
      o.items.forEach(i => {
        itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity;
      });
    });
    
    let topItem = 'N/A';
    let topCount = 0;
    Object.entries(itemCounts).forEach(([name, count]) => {
      if (count > topCount) {
        topCount = count;
        topItem = name;
      }
    });

    return { totalSales, orderCount: todaysOrders.length, topItem };
  };

  const stats = getDashboardStats();

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) || 
    order.userDetails.name.toLowerCase().includes(orderSearchQuery.toLowerCase())
  );

  const getFilteredHistory = () => {
    return orders.filter(order => {
      const orderDate = new Date(order.timestamp);
      
      let startMatch = true;
      if (historyStartDate) {
        const [y, m, d] = historyStartDate.split('-').map(Number);
        const startDate = new Date(y, m - 1, d); // Local midnight
        startMatch = orderDate >= startDate;
      }

      let endMatch = true;
      if (historyEndDate) {
        const [y, m, d] = historyEndDate.split('-').map(Number);
        const endDate = new Date(y, m - 1, d, 23, 59, 59, 999); // Local end of day
        endMatch = orderDate <= endDate;
      }

      const statusMatch = historyStatusFilter === 'ALL' || order.status === historyStatusFilter;

      const searchMatch = !historySearchQuery || 
        order.userDetails.name.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
        order.userDetails.phone.includes(historySearchQuery);

      return startMatch && endMatch && statusMatch && searchMatch;
    });
  };

  const historyOrders = getFilteredHistory();

  const getCustomerOrderCount = (phone: string) => {
      return orders.filter(o => o.userDetails.phone === phone).length;
  };

  const viewCustomerHistory = (phone: string) => {
      setHistorySearchQuery(phone);
      setActiveTab('HISTORY');
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20 relative">
      {/* Toast Notification */}
      {activeNotification && (
        <div className="fixed top-20 right-4 z-[60] bg-gray-900 text-white p-4 rounded-xl shadow-2xl animate-bounce-slight max-w-sm w-full border-l-4 border-orange-500">
           <div className="flex justify-between items-start mb-2">
             <h4 className="font-bold text-orange-400 flex items-center gap-2">
               <Bell size={18} /> New Order Received!
             </h4>
             <button onClick={() => setActiveNotification(null)} className="text-gray-400 hover:text-white">
               <X size={16} />
             </button>
           </div>
           <p className="font-semibold text-lg">{activeNotification.userDetails.name}</p>
           <p className="text-gray-300 text-sm mb-2">{activeNotification.items.length} items • ₹{activeNotification.totalAmount}</p>
           <div className="text-xs text-gray-400">
              Just now • Online Payment
           </div>
        </div>
      )}

      {/* Admin Header */}
      <div className="bg-gray-900 text-white p-4 sticky top-0 z-10 flex justify-between items-center shadow-lg pt-[calc(1rem+safe-area-inset-top)]">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings size={20} className="text-orange-400" />
          Admin Panel
        </h1>
        <div className="flex gap-4 items-center">
            <button 
              onClick={playNotificationSound} 
              className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
              title="Test Notification Sound"
            >
              <Volume2 size={20} className="text-blue-300" />
            </button>

            {newOrderCount > 0 && (
                <button 
                  onClick={() => { setNewOrderCount(0); setActiveTab('ORDERS'); }}
                  className="relative p-2 bg-gray-800 rounded-full hover:bg-gray-700"
                >
                    <Bell size={20} className="text-yellow-400" />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold animate-bounce">
                        {newOrderCount}
                    </span>
                </button>
            )}
            <button onClick={onLogout} className="text-sm bg-gray-800 px-3 py-1 rounded hover:bg-gray-700">
            Logout
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white shadow-sm mb-4 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('DASHBOARD')}
          className={`flex-1 py-4 font-semibold text-sm flex justify-center items-center gap-2 min-w-[100px] ${
            activeTab === 'DASHBOARD' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'
          }`}
        >
          <LayoutDashboard size={18} /> Dashboard
        </button>
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`flex-1 py-4 font-semibold text-sm flex justify-center items-center gap-2 min-w-[100px] ${
            activeTab === 'ORDERS' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'
          }`}
        >
          <Package size={18} /> Orders
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 py-4 font-semibold text-sm flex justify-center items-center gap-2 min-w-[100px] ${
            activeTab === 'HISTORY' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'
          }`}
        >
          <HistoryIcon size={18} /> History
        </button>
        <button
          onClick={() => setActiveTab('MENU')}
          className={`flex-1 py-4 font-semibold text-sm flex justify-center items-center gap-2 min-w-[100px] ${
            activeTab === 'MENU' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'
          }`}
        >
          <MenuIcon size={18} /> Menu
        </button>
        <button
          onClick={() => setActiveTab('BANNERS')}
          className={`flex-1 py-4 font-semibold text-sm flex justify-center items-center gap-2 min-w-[100px] ${
            activeTab === 'BANNERS' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'
          }`}
        >
          <ImageIcon size={18} /> Banners
        </button>
        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`flex-1 py-4 font-semibold text-sm flex justify-center items-center gap-2 min-w-[100px] ${
            activeTab === 'SETTINGS' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'
          }`}
        >
          <Settings size={18} /> Settings
        </button>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {activeTab === 'DASHBOARD' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-lg"><DollarSign size={24} /></div>
                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">TODAY</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-1">₹{stats.totalSales}</h3>
                    <p className="text-green-100 text-sm font-medium">Total Sales</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-lg"><ShoppingCart size={24} /></div>
                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">TODAY</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-1">{stats.orderCount}</h3>
                    <p className="text-orange-100 text-sm font-medium">Orders Received</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-lg"><TrendingUp size={24} /></div>
                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">ALL TIME</span>
                    </div>
                    <h3 className="text-xl font-bold mb-1 line-clamp-1">{stats.topItem}</h3>
                    <p className="text-purple-100 text-sm font-medium">Top Selling Item</p>
                </div>
            </div>
        )}

        {activeTab === 'ORDERS' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-2">
                <h2 className="text-lg font-bold text-gray-800 w-full sm:w-auto">Recent Orders</h2>
                
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search by ID or Name" 
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        className="w-full bg-white border border-gray-300 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {orderSearchQuery && (
                        <button 
                            onClick={() => setOrderSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex justify-end mb-2">
                <button onClick={refreshData} className="text-sm text-blue-600 font-normal hover:underline flex items-center gap-1">
                    <RefreshCw size={12} /> Refresh List
                </button>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                    <Search size={48} className="text-gray-200 mb-2" />
                    <p>No orders found matching "{orderSearchQuery}"</p>
                </div>
            ) : filteredOrders.map(order => {
                const orderCount = getCustomerOrderCount(order.userDetails.phone);
                const isRepeat = orderCount > 1;

                return (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                      <div>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-1 ${
                          order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'
                        }`}>
                          {order.status}
                        </span>
                        <p className="text-xs text-gray-500 font-mono font-bold mt-1 text-orange-600">{order.id.startsWith('#') ? order.id : `#${order.id.slice(-6)}`}</p>
                        <p className="text-[10px] text-gray-400">{new Date(order.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">₹{order.totalAmount}</p>
                        <div className="flex items-center gap-1 justify-end text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full mt-1">
                           <CheckCircle size={10} /> Online Payment
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm text-gray-700">
                          <span>{item.quantity} x {item.name}</span>
                          <span>₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mb-4 relative">
                      {/* Repeat Customer Badge */}
                      <div className="absolute top-2 right-2">
                          {isRepeat ? (
                             <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <User size={10} /> Repeat ({orderCount})
                             </span>
                          ) : (
                             <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <User size={10} /> First Order
                             </span>
                          )}
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{order.userDetails.name}</p>
                        <button 
                            onClick={() => viewCustomerHistory(order.userDetails.phone)}
                            className="text-gray-400 hover:text-orange-600 transition-colors"
                            title="View Customer History"
                        >
                            <HistoryIcon size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                          <a href={`tel:${order.userDetails.phone}`} className="text-blue-600 flex items-center gap-1 text-xs bg-blue-50 px-2 py-1 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors">
                            <Phone size={12} /> Call: {order.userDetails.phone}
                          </a>
                      </div>
                      
                      {/* Map Button */}
                      <button 
                        onClick={() => openMap(order.userDetails)}
                        className="flex items-start gap-2 text-orange-700 font-medium hover:underline hover:bg-orange-50 p-1 rounded -ml-1 transition-colors text-left"
                        title="Open Delivery Map"
                      >
                        <MapPin size={16} className="flex-shrink-0 mt-0.5 text-orange-600" />
                        <span className="line-clamp-2">{order.userDetails.address}</span>
                      </button>
                    </div>

                    <div className="flex gap-2">
                      {order.status !== 'DELIVERED' && (
                        <button
                            onClick={() => handleStatusUpdate(order.id, OrderStatus.DELIVERED)}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
                        >
                            Mark Delivered
                        </button>
                      )}
                      <a href={`tel:${order.userDetails.phone}`} className="flex-1 border border-gray-300 text-center py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 flex items-center justify-center gap-2">
                        <Phone size={14} /> Call Customer
                      </a>
                    </div>
                  </div>
                );
            })}
          </div>
        )}

        {activeTab === 'HISTORY' && (
             <div className="space-y-6">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
               <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                 <Calendar size={18} className="text-orange-500"/> Filter History
               </h3>
               {/* Filters UI */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Customer Search</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-sm outline-none" placeholder="Search Name or Phone..." value={historySearchQuery} onChange={(e) => setHistorySearchQuery(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Status</label>
                    <select className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-sm outline-none" value={historyStatusFilter} onChange={(e) => setHistoryStatusFilter(e.target.value as OrderStatus | 'ALL')}>
                      <option value="ALL">All Statuses</option>
                      {Object.values(OrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
               </div>
               {/* Date Inputs */}
               <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-xs font-bold text-gray-500 mb-1 block">Start Date</label><input type="date" className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-sm outline-none" value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} /></div>
                 <div><label className="text-xs font-bold text-gray-500 mb-1 block">End Date</label><input type="date" className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-sm outline-none" value={historyEndDate} onChange={(e) => setHistoryEndDate(e.target.value)} /></div>
               </div>
             </div>
             {/* Results List */}
             <div className="space-y-4">
                {historyOrders.map(order => (
                    <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between gap-4">
                         <div className="flex-1">
                            <h4 className="font-bold text-gray-800">{order.userDetails.name} <span className="text-xs font-normal text-gray-400">({order.id.startsWith('#') ? order.id : `#${order.id.slice(-6)}`})</span></h4>
                            <p className="text-xs text-gray-500">{order.userDetails.phone}</p>
                         </div>
                         <span className="font-bold text-gray-900">₹{order.totalAmount}</span>
                    </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'MENU' && (
          <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800">Menu Management</h2>
                <button 
                    onClick={() => {
                        setEditingItem({
                            id: 'new',
                            name: '',
                            price: 0,
                            description: '',
                            imageUrl: '',
                            available: true,
                            category: 'Recommended',
                            isVeg: true
                        });
                        setIsFormOpen(true);
                    }}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-md hover:bg-orange-700 transition-colors"
                >
                    <Plus size={16} /> Add Item
                </button>
            </div>

            {/* Category Images Management */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                 <h3 className="font-bold text-gray-700 mb-3 text-sm">Category Thumbnail Images</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from(new Set(['Recommended', 'Breads', 'Curries', 'Other', ...menu.map(i => i.category)])).filter(Boolean).map(cat => (
                        <div key={cat} className="flex flex-col items-center gap-2 border border-gray-100 p-2 rounded-lg">
                            <div className="w-16 h-16 rounded-full bg-gray-100 relative overflow-hidden group border border-gray-200">
                                <img src={categoryImages[cat] || categoryImages['Other'] || 'https://via.placeholder.com/100'} alt={cat} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-xs font-bold text-center truncate w-full">{cat}</span>
                            <label className="text-[10px] text-blue-600 font-bold cursor-pointer hover:underline bg-blue-50 px-2 py-1 rounded">
                                Change
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleCategoryImageUpload(e, cat)} />
                            </label>
                        </div>
                    ))}
                 </div>
            </div>

            <div className="space-y-4">
                {menu.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition-shadow hover:shadow-md">
                        {/* Thumbnail Display */}
                        <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative">
                           <img 
                              src={item.imageUrl || 'https://placehold.co/400?text=No+Img'} 
                              className="w-full h-full object-cover" 
                              alt={item.name} 
                           />
                           {!item.available && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">OFF</div>}
                        </div>

                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase">{item.category}</span>
                                    <h4 className="font-bold text-lg text-gray-800">{item.name}</h4>
                                </div>
                                <div className={`w-3 h-3 border ${item.isVeg ? 'border-green-600' : 'border-red-600'} flex items-center justify-center p-[1px]`}>
                                    <div className={`w-full h-full rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                </div>
                            </div>
                            
                            <p className="text-sm text-gray-500 mb-1 line-clamp-1">{item.description}</p>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">₹{item.price}</span>
                              
                              {/* QUICK STOCK TOGGLE */}
                              <button 
                                onClick={() => toggleItemStock(item.id, item.available)}
                                className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border transition-all ${item.available ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                              >
                                {item.available ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                {item.available ? 'In Stock' : 'Out of Stock'}
                              </button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => { setEditingItem(item); setIsFormOpen(true); }} className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"><Edit2 size={18} /></button>
                            <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"><Trash size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* Banners & Settings (Existing Code - Keeping concise) */}
        {activeTab === 'BANNERS' && (
             <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-800">Promotional Banners</h2>
                {/* Upload Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">Add New Banner</h3>
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex-1 w-full">
                           <div className="relative group w-full h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => bannerInputRef.current?.click()}>
                               {newBannerUrl ? (
                                   <img src={newBannerUrl} alt="Preview" className="w-full h-full object-cover" />
                               ) : (
                                   <div className="text-center text-gray-400"><Upload size={24} className="mx-auto mb-2" /><span className="text-xs">Click to Upload Image</span></div>
                               )}
                           </div>
                           <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={handleBannerUpload} />
                        </div>
                        <button onClick={handleAddBanner} disabled={!newBannerUrl} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed h-full mt-auto">Add Banner</button>
                    </div>
                </div>
                {/* List */}
                <div className="space-y-4">
                    {banners.map(banner => (
                        <div key={banner.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                            <img src={banner.imageUrl} alt="Banner" className="w-24 h-16 object-cover rounded-lg bg-gray-100" />
                            <div className="flex-1">
                                <span className={`text-xs font-bold ${banner.active ? 'text-green-600' : 'text-gray-400'}`}>{banner.active ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleBanner(banner.id)} className="p-2 bg-gray-100 rounded-lg">{banner.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}</button>
                                <button onClick={() => deleteBanner(banner.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'SETTINGS' && (
           <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-6">App Settings</h2>
              <div className="max-w-md space-y-6">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Delivery Fee (₹)</label>
                    <input type="number" min="0" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg outline-none" value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value))} />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Admin Access PIN</label>
                    <input type="text" maxLength={4} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg outline-none font-bold" value={adminPin} onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                 </div>
                 <div className="pt-4 border-t">
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Data Management</h3>
                    <button 
                        onClick={() => {
                            const backup = Store.createBackup();
                            const blob = new Blob([backup], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `saraswathi_backup_${Date.now()}.json`;
                            a.click();
                        }}
                        className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold text-sm mb-2 border border-blue-200"
                    >
                        Download Backup
                    </button>
                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".json"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        if (confirm("Restore data? This will overwrite current menu and settings.")) {
                                            if (Store.restoreBackup(event.target?.result as string)) {
                                                alert("Restore successful! Reloading...");
                                                window.location.reload();
                                            } else {
                                                alert("Invalid backup file.");
                                            }
                                        }
                                    };
                                    reader.readAsText(e.target.files[0]);
                                }
                            }}
                        />
                        <button className="w-full bg-gray-50 text-gray-600 py-3 rounded-xl font-bold text-sm border border-gray-200">Restore Data</button>
                    </div>
                 </div>
                 <button onClick={handleSaveSettings} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold w-full">Save Settings</button>
              </div>
           </div>
        )}
      </div>

      {/* Map Modal */}
      {showMapModal && selectedLocation && (
          <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
                  <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <MapPin size={20} className="text-orange-600" />
                          <div>
                              <h3 className="font-bold text-lg leading-tight">Delivery Location</h3>
                              <p className="text-xs text-gray-500 line-clamp-1">{selectedLocation.name}</p>
                          </div>
                      </div>
                      <button onClick={() => setShowMapModal(false)} className="p-2 hover:bg-gray-200 rounded-full">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="flex-1 bg-gray-100 relative">
                      <iframe 
                        title="Delivery Map"
                        width="100%" 
                        height="100%" 
                        frameBorder="0" 
                        style={{ border: 0 }}
                        src={`https://maps.google.com/maps?q=${selectedLocation.coordinates ? `${selectedLocation.coordinates.lat},${selectedLocation.coordinates.lng}` : encodeURIComponent(selectedLocation.address)}&z=15&output=embed`}
                        allowFullScreen
                      ></iframe>
                  </div>
                  
                  <div className="p-4 bg-white border-t space-y-3">
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                          <p className="text-sm font-medium text-gray-800">{selectedLocation.address}</p>
                          {selectedLocation.deliveryInstructions && (
                              <p className="text-xs text-gray-500 mt-1 italic">Note: "{selectedLocation.deliveryInstructions}"</p>
                          )}
                      </div>
                      <a 
                         href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.coordinates ? `${selectedLocation.coordinates.lat},${selectedLocation.coordinates.lng}` : encodeURIComponent(selectedLocation.address)}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-colors"
                      >
                          <Navigation size={18} /> Navigate with Google Maps
                      </a>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Form Modal (Existing) */}
      {isFormOpen && editingItem && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-gray-50 p-4 border-b flex justify-between items-center"><h3 className="font-bold text-xl">{editingItem.id === 'new' ? 'Add Item' : 'Edit Item'}</h3><button onClick={() => setIsFormOpen(false)}><X size={24} /></button></div>
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                           <div className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center relative group" onClick={() => fileInputRef.current?.click()}>
                              {editingItem.imageUrl ? <img src={editingItem.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon size={48} className="text-gray-400" />}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span className="text-white font-bold"><Upload size={20} /> Upload</span></div>
                           </div>
                           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                           <input placeholder="Or Paste URL" className="w-full text-xs border p-2 rounded" value={editingItem.imageUrl} onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})} />
                       </div>
                       <div className="space-y-4">
                           <input required className="w-full border p-3 rounded" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} placeholder="Name" />
                           <div className="grid grid-cols-2 gap-2">
                               <input required type="number" className="w-full border p-3 rounded" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})} placeholder="Price" />
                               <input type="text" list="cat" className="w-full border p-3 rounded" value={editingItem.category || ''} onChange={e => setEditingItem({...editingItem, category: e.target.value})} placeholder="Category" />
                               <datalist id="cat"><option value="Recommended"/><option value="Breads"/><option value="Curries"/></datalist>
                           </div>
                           <textarea className="w-full border p-3 rounded h-24" value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} placeholder="Description" />
                           <div className="flex gap-4">
                               <button type="button" onClick={() => setEditingItem({...editingItem, available: !editingItem.available})} className={`flex-1 p-3 rounded border font-bold ${editingItem.available ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>Available</button>
                               <button type="button" onClick={() => setEditingItem({...editingItem, isVeg: !editingItem.isVeg})} className={`flex-1 p-3 rounded border font-bold ${editingItem.isVeg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{editingItem.isVeg ? 'Veg' : 'Non-Veg'}</button>
                           </div>
                       </div>
                    </form>
                  </div>
                  <div className="p-4 border-t bg-gray-50 flex justify-end gap-3"><button onClick={() => setIsFormOpen(false)} className="px-6 py-3 font-bold text-gray-600">Cancel</button><button onClick={handleSaveItem} className="px-8 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg">Save</button></div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Admin;
