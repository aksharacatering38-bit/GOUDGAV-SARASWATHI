
import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Star, Minus, Plus, Phone, Share2, Heart } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { MenuItem, CartItem, Banner } from '../types';
import { CUTOFF_HOUR, STORE_NAME } from '../constants';
import * as Store from '../services/store';

interface MenuProps {
  menu: MenuItem[];
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  goToCart: () => void;
}

const Menu: React.FC<MenuProps> = ({ menu, cart, addToCart, updateQuantity, goToCart }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  
  const currentHour = new Date().getHours();
  const isShopClosed = currentHour >= CUTOFF_HOUR;
  
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  useEffect(() => {
    setFavorites(Store.getFavorites());
    setBanners(Store.getBanners().filter(b => b.active));
    setCategoryImages(Store.getCategoryImages());
  }, []);

  const triggerHaptic = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Haptics not available (web)
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: STORE_NAME,
        text: `Order delicious homemade food from ${STORE_NAME}!`,
        url: window.location.href, // Or your app link
        dialogTitle: 'Share with friends',
      });
    } catch (e) {
      console.log('Share dismissed');
    }
  };

  const toggleFav = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    triggerHaptic();
    Store.toggleFavorite(itemId);
    setFavorites(Store.getFavorites());
  };

  const getItemQuantity = (itemId: string) => {
    return cart.find(i => i.id === itemId)?.quantity || 0;
  };

  // Filter Logic
  let filteredMenu = menu.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (activeCategory === 'FAVORITES') {
    filteredMenu = filteredMenu.filter(item => favorites.includes(item.id));
  } else if (activeCategory !== 'ALL') {
    filteredMenu = filteredMenu.filter(item => item.category === activeCategory);
  }

  const allCategories = Array.from(new Set(menu.map(item => item.category || 'Other'))) as string[];
  allCategories.sort((a, b) => {
    if (a === 'Recommended') return -1;
    if (b === 'Recommended') return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {/* Search & Share Header */}
      <div className="bg-white p-4 sticky top-[60px] z-[5] shadow-sm space-y-3">
        <div className="flex gap-2">
            <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
                type="text" 
                placeholder="Search for tiffins..." 
                className="w-full bg-gray-100 py-3 pl-10 pr-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            </div>
            <button 
              onClick={handleShare}
              className="bg-green-50 text-green-600 p-3 rounded-xl hover:bg-green-100 transition-colors"
            >
              <Share2 size={20} />
            </button>
        </div>

        {/* Category Filter Pills (Text Only fallback) */}
        {searchQuery && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
               <button 
                  onClick={() => { triggerHaptic(); setActiveCategory('ALL'); }}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${activeCategory === 'ALL' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
               >
                  All
               </button>
               <button 
                  onClick={() => { triggerHaptic(); setActiveCategory('FAVORITES'); }}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border flex items-center gap-1 ${activeCategory === 'FAVORITES' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-500 border-gray-200'}`}
               >
                  <Heart size={12} fill={activeCategory === 'FAVORITES' ? 'currentColor' : 'none'} /> Favorites
               </button>
               {allCategories.map(cat => (
                   <button 
                      key={cat}
                      onClick={() => { triggerHaptic(); setActiveCategory(cat); }}
                      className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${activeCategory === cat ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'}`}
                   >
                      {cat}
                   </button>
               ))}
          </div>
        )}
      </div>

      {/* "What's on your mind?" Visual Categories (Swiggy Style) - ONLY SHOW ON HOME/NO SEARCH */}
      {!searchQuery && activeCategory === 'ALL' && (
        <div className="bg-white pb-4 mb-2">
            <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 mt-2">What's on your mind?</h3>
            <div className="flex gap-6 overflow-x-auto no-scrollbar px-4 pb-2">
                {/* Favorites Circle */}
                <div onClick={() => setActiveCategory('FAVORITES')} className="flex flex-col items-center gap-2 min-w-[70px] cursor-pointer">
                    <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center shadow-sm">
                        <Heart size={24} className="text-red-500 fill-red-500" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">Favorites</span>
                </div>
                
                {allCategories.map(cat => (
                    <div key={cat} onClick={() => setActiveCategory(cat)} className="flex flex-col items-center gap-2 min-w-[70px] cursor-pointer">
                        <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 overflow-hidden shadow-sm">
                            <img src={categoryImages[cat] || categoryImages['Other']} alt={cat} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-bold text-gray-700 text-center whitespace-nowrap">{cat}</span>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Banners Carousel */}
      {banners.length > 0 && activeCategory === 'ALL' && !searchQuery && (
          <div className="mt-2 px-4 mb-6">
              <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
                  {banners.map(banner => (
                      <div key={banner.id} className="min-w-[85%] snap-center">
                          <div className="h-40 rounded-2xl overflow-hidden shadow-sm relative">
                              <img src={banner.imageUrl} alt="Promo" className="w-full h-full object-cover" />
                              {banner.title && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                      <p className="text-white font-bold text-lg">{banner.title}</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Warning Banner */}
      {isShopClosed && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded-r shadow-sm">
            <p className="font-bold text-red-700 text-sm">Orders Closed</p>
            <p className="text-xs text-red-600">We accept orders before 6 PM only.</p>
          </div>
      )}

      {!isShopClosed && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mx-4 mb-4 rounded-r flex items-center justify-between">
           <div>
             <p className="font-bold text-blue-800 text-xs">PRE-ORDER OPEN</p>
             <p className="text-[10px] text-blue-600 uppercase tracking-wide">Delivery by 8 PM Today</p>
           </div>
           <span className="text-2xl">🛵</span>
        </div>
      )}

      {/* Menu List */}
      <div className="space-y-6 mt-2 pb-4">
          <div className="bg-white pb-2 min-h-[300px]">
            {activeCategory !== 'ALL' && activeCategory !== 'FAVORITES' && (
                <div className="px-4 py-4 flex items-center gap-2">
                    <div className="w-1 h-6 bg-orange-600 rounded-full"></div>
                    <h3 className="text-lg font-extrabold text-gray-800">{activeCategory}</h3>
                </div>
            )}
            
            {filteredMenu.length === 0 ? (
                <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                    <Search size={48} className="text-gray-200 mb-2" />
                    <p>No items found.</p>
                </div>
            ) : (
                <div>
                {filteredMenu.map((item, index, arr) => {
                    const qty = getItemQuantity(item.id);
                    const isLast = index === arr.length - 1;
                    const isFav = favorites.includes(item.id);
                    
                    return (
                    <div key={item.id} className={`px-4 py-6 flex gap-4 ${!isLast ? 'border-b border-gray-100' : ''}`}>
                        {/* Text Section */}
                        <div className="flex-1">
                        {/* Veg Symbol */}
                        <div className="mb-2">
                            {item.isVeg ? (
                            <div className="border border-green-600 w-4 h-4 flex items-center justify-center p-[2px]">
                                <div className="bg-green-600 w-full h-full rounded-full"></div>
                            </div>
                            ) : (
                            <div className="border border-red-600 w-4 h-4 flex items-center justify-center p-[2px]">
                                <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[8px] border-l-transparent border-r-transparent border-b-red-600"></div>
                            </div>
                            )}
                        </div>

                        {item.isBestseller && (
                            <div className="flex items-center gap-1 mb-1">
                            <Star size={12} className="text-orange-500 fill-orange-500" />
                            <span className="text-[10px] font-bold text-orange-500">BESTSELLER</span>
                            </div>
                        )}

                        <h4 className="font-bold text-gray-800 text-base mb-1">{item.name}</h4>
                        <div className="font-semibold text-gray-700 text-sm mb-2">₹{item.price}</div>
                        
                        {item.rating && (
                            <div className="inline-flex items-center gap-1 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded text-[10px] text-green-700 font-bold mb-2">
                            <Star size={8} className="fill-green-700" /> {item.rating} <span className="text-gray-400 font-normal">({item.votes})</span>
                            </div>
                        )}

                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>
                        </div>

                        {/* Image Section */}
                        <div className="relative w-32 flex-shrink-0">
                        <div className="w-32 h-28 rounded-xl overflow-hidden shadow-sm bg-gray-100 relative">
                            {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            )}
                            {/* Favorite Heart Button */}
                            <button 
                                onClick={(e) => toggleFav(e, item.id)}
                                className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow-sm flex items-center justify-center transition-transform active:scale-90 z-10"
                            >
                                <Heart size={14} className={isFav ? "text-red-500 fill-red-500" : "text-gray-400"} />
                            </button>
                        </div>
                        
                        {/* Add Button */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 shadow-lg rounded-lg bg-white overflow-hidden border border-gray-100">
                            {isShopClosed || !item.available ? (
                                <div className="text-xs font-bold text-gray-400 text-center py-2 bg-gray-50">UNAVAILABLE</div>
                            ) : qty === 0 ? (
                                <button 
                                onClick={() => { triggerHaptic(); addToCart(item); }}
                                className="w-full py-2 text-green-600 font-extrabold text-sm hover:bg-green-50 uppercase"
                                >
                                ADD
                                </button>
                            ) : (
                                <div className="flex items-center justify-between px-2 py-1.5 bg-white">
                                    <button onClick={() => { triggerHaptic(); updateQuantity(item.id, -1); }} className="text-gray-500 hover:text-green-600 p-1">
                                    <Minus size={14} strokeWidth={3} />
                                    </button>
                                    <span className="text-green-600 font-extrabold text-sm">{qty}</span>
                                    <button onClick={() => { triggerHaptic(); updateQuantity(item.id, 1); }} className="text-green-600 p-1">
                                    <Plus size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                    );
                })}
                </div>
            )}
          </div>
      </div>

      {/* Floating Cart Bar (Swiggy Style) */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-8">
          <button
            onClick={goToCart}
            className="w-full bg-green-600 text-white p-3 rounded-xl shadow-xl flex justify-between items-center animate-fade-in hover:scale-[1.01] transition-transform"
          >
            <div className="flex flex-col items-start pl-2">
              <span className="text-xs font-medium uppercase tracking-wider text-green-100">{cartItemCount} ITEMS</span>
              <span className="font-bold text-lg">₹{cartTotal} <span className="text-sm font-normal text-green-100 opacity-80 ml-1">plus taxes</span></span>
            </div>
            <div className="flex items-center gap-2 pr-2 font-bold text-sm">
              View Cart <ShoppingBag size={18} />
            </div>
          </button>
        </div>
      )}

      {/* Call FAB */}
      <a
        href="tel:9959730602"
        className="fixed bottom-40 right-4 z-40 p-4 rounded-full shadow-lg bg-green-600 text-white hover:bg-green-700 transition-all transform hover:scale-105"
      >
        <Phone size={24} />
      </a>
    </div>
  );
};

export default Menu;
