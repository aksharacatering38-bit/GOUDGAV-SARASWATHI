
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, Clock, CreditCard, ShieldCheck, MapPin } from 'lucide-react';
import { UserDetails, UserProfile } from '../types';
import { CUTOFF_HOUR, RAZORPAY_KEY_ID, STORE_NAME } from '../constants';
import * as Store from '../services/store';

interface CheckoutProps {
  total: number;
  currentUser: UserProfile | null;
  goBack: () => void;
  onPlaceOrder: (details: UserDetails, paymentId: string) => Promise<void>;
}

const Checkout: React.FC<CheckoutProps> = ({ total, currentUser, goBack, onPlaceOrder }) => {
  const [details, setDetails] = useState<UserDetails>({
    name: '',
    phone: '',
    address: '',
    email: '',
    deliveryInstructions: '',
    coordinates: undefined
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const isLate = new Date().getHours() >= CUTOFF_HOUR;

  // Auto-fill form if user is logged in
  useEffect(() => {
    if (currentUser) {
      setDetails({
        name: currentUser.name,
        phone: currentUser.phone,
        address: currentUser.address,
        email: currentUser.email || '',
        deliveryInstructions: currentUser.deliveryInstructions || '',
        coordinates: currentUser.coordinates
      });
    }
  }, [currentUser]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Request specific address details
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();
          
          if (data && data.address) {
             const addr = data.address;
             
             // Check for Hyderabad
             const city = addr.city || addr.state_district || addr.county || '';
             const isHyderabad = city.toLowerCase().includes('hyderabad') || city.toLowerCase().includes('secunderabad');
             
             if (!isHyderabad) {
                 alert("We currently only deliver within Hyderabad. Please ensure you are in the service area.");
             }

             // Construct the full address string format (Matches Login logic)
             // H.No, Building, Street, Area, Pincode
             
             const houseNo = addr.house_number || addr.flat_number || '';
             const building = addr.building || addr.amenity || '';
             const road = addr.road || '';
             const area = addr.suburb || addr.neighbourhood || addr.residential || addr.village || addr.city_district || '';
             const pincode = addr.postcode || '';

             // Filter admin terms
             const cleanArea = area.replace(/Ward No \d+/i, '').replace(/Circle \d+/i, '').trim();

             const addressParts = [];
             if (houseNo) addressParts.push(`H.No ${houseNo}`);
             if (building) addressParts.push(building);
             if (road) addressParts.push(road);
             if (cleanArea) addressParts.push(cleanArea);
             if (city) addressParts.push(city);
             if (pincode) addressParts.push(pincode);
             
             const formattedAddress = addressParts.join(', ');
             
             setDetails(prev => ({ 
                 ...prev, 
                 address: formattedAddress,
                 coordinates: { lat: latitude, lng: longitude }
             }));
          } else {
            alert("Could not fetch address from coordinates.");
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          alert("Failed to get address. Please enter manually.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Location error:", error.message);
        
        let msg = "Could not detect location.";
        // Handle specific Permission Policy error
        if (error.message.includes("permissions policy")) {
            msg = "Location access is disabled by browser policy. Please enter address manually.";
        } else if (error.code === error.PERMISSION_DENIED) {
           msg = "Permission denied. Please enable location access in your browser settings.";
        } else if (error.code === error.TIMEOUT) {
           msg = "Location request timed out.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
           msg = "Location unavailable.";
        }
        
        alert(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLate) return;
    
    if ((RAZORPAY_KEY_ID as string) === "YOUR_RAZORPAY_KEY_ID_HERE") {
        alert("Admin Warning: Razorpay Key ID is not configured in constants.ts. Payment cannot proceed.");
        return;
    }

    setIsProcessing(true);

    const options = {
        key: RAZORPAY_KEY_ID,
        amount: total * 100, // Amount is in currency subunits (paise)
        currency: "INR",
        name: STORE_NAME,
        description: "Food Order Payment",
        // image: "https://your-logo-url.com/logo.png", // Optional: Add your logo here
        handler: function (response: any) {
            // This handler is called AUTOMATICALLY when payment is successful
            setIsProcessing(false);
            
            // Update saved user profile with new address/instructions if changed
            if (currentUser) {
                const updatedUser: UserProfile = {
                    ...currentUser,
                    name: details.name,
                    email: details.email,
                    address: details.address,
                    deliveryInstructions: details.deliveryInstructions,
                    coordinates: details.coordinates
                };
                Store.saveCurrentUser(updatedUser);
            }

            if (response.razorpay_payment_id) {
                onPlaceOrder(details, response.razorpay_payment_id);
            }
        },
        prefill: {
            name: details.name,
            email: details.email,
            contact: details.phone
        },
        theme: {
            color: "#ea580c" // Matches orange-600
        },
        modal: {
            ondismiss: function() {
                setIsProcessing(false);
                alert("Payment was not completed. If money was deducted, it will be automatically refunded within 5-7 business days.");
            }
        }
    };

    try {
        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response: any){
            alert("Payment Failed: " + response.error.description + "\n\nNote: If any amount was deducted, it will be refunded by Razorpay automatically within 5-7 working days.");
            setIsProcessing(false);
        });
        rzp1.open();
    } catch (error) {
        console.error("Razorpay Error:", error);
        alert("Could not initiate payment. Please check connection.");
        setIsProcessing(false);
    }
  };

  if (isLate) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-red-100 p-6 rounded-full mb-6">
          <Clock size={48} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Orders Closed</h2>
        <p className="text-gray-600 mb-6">
          We do not accept orders after 6 PM. Please come back tomorrow!
        </p>
        <button
          onClick={goBack}
          className="bg-gray-800 text-white px-8 py-3 rounded-xl font-semibold"
        >
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4 pt-[calc(1rem+safe-area-inset-top)]">
        <button onClick={goBack} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6 max-w-lg mx-auto pb-safe-bottom">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
             <ShieldCheck size={18} className="text-green-600"/> Delivery Details
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              required
              type="text"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              placeholder="Enter your name"
              value={details.name}
              onChange={e => setDetails({...details, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              required
              type="tel"
              readOnly={!!currentUser} // Read-only if logged in (user ID)
              className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${currentUser ? 'opacity-70 cursor-not-allowed' : ''}`}
              placeholder="+91 98765 43210"
              value={details.phone}
              onChange={e => setDetails({...details, phone: e.target.value})}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
               <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
               <button 
                 type="button" 
                 onClick={handleDetectLocation}
                 disabled={isLocating}
                 className="text-orange-600 text-xs font-bold flex items-center gap-1 bg-orange-50 px-2 py-1 rounded hover:bg-orange-100"
               >
                 <MapPin size={12} /> {isLocating ? 'Detecting...' : 'Current Location'}
               </button>
            </div>
            <textarea
              required
              rows={3}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              placeholder="House no, Street, Landmark..."
              value={details.address}
              onChange={e => setDetails({...details, address: e.target.value})}
            />
          </div>

           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
            <input
              type="email"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              placeholder="your@email.com"
              value={details.email}
              onChange={e => setDetails({...details, email: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Instructions (Optional)</label>
            <input
              type="text"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              placeholder="E.g. Leave at security, Don't ring bell"
              value={details.deliveryInstructions}
              onChange={e => setDetails({...details, deliveryInstructions: e.target.value})}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full bg-orange-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-200 flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors ${isProcessing ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {isProcessing ? 'Processing...' : (
              <>
                <CreditCard size={20} />
                Pay ₹{total} & Place Order
              </>
          )}
        </button>
        <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
            Secure online payment via Razorpay. Order is confirmed automatically upon success.
            </p>
            <p className="text-[10px] text-red-500 font-medium">
                Refund Policy: If payment fails but money is deducted, Razorpay will automatically refund it within 5-7 business days.
            </p>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
