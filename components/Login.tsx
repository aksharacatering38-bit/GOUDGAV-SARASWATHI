
import React, { useState, useEffect } from 'react';
import { ChefHat, ArrowRight, User, Mail, MapPin, Navigation, X, Building, MessageSquare } from 'lucide-react';
import { UserProfile } from '../types';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [step, setStep] = useState<'PHONE' | 'DETAILS'>('PHONE');
  const [phone, setPhone] = useState('');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [apartment, setApartment] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [isLocating, setIsLocating] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Trigger location modal when reaching details step
  useEffect(() => {
    if (step === 'DETAILS') {
      setShowLocationModal(true);
    }
  }, [step]);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }
    // Skip OTP, go straight to details
    setStep('DETAILS');
  };

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
          setCoordinates({ lat: latitude, lng: longitude });

          // Request address details to parse specific fields
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();
          
          if (data && data.address) {
            const addr = data.address;
            
            // 1. Check if location is in Hyderabad
            const city = addr.city || addr.state_district || addr.county || '';
            const isHyderabad = city.toLowerCase().includes('hyderabad') || city.toLowerCase().includes('secunderabad');
            
            if (!isHyderabad) {
                alert("We currently only deliver within Hyderabad. Please enter a local address manually or ensure you are in the service area.");
                setIsLocating(false);
            }

            // 2. Extract specific fields
            const houseNo = addr.house_number || addr.flat_number || '';
            const building = addr.building || addr.amenity || '';
            const road = addr.road || '';
            const area = addr.suburb || addr.neighbourhood || addr.residential || addr.village || addr.city_district || '';
            const pincode = addr.postcode || '';

            // 3. Auto-fill Apartment field (House No / Building)
            // Example: H.No 1-9-294/2, R.B.S Deccan Residency
            const aptParts = [];
            if (houseNo) aptParts.push(`H.No ${houseNo}`);
            if (building) aptParts.push(building);
            setApartment(aptParts.join(', '));

            // 4. Auto-fill Address field (Street, Area, Pincode)
            // Filter out "Ward" or "Circle" which are administrative noise
            const cleanArea = area.replace(/Ward No \d+/i, '').replace(/Circle \d+/i, '').trim();
            const addrDetails = [road, cleanArea, city, pincode].filter(Boolean).join(', ');
            setAddress(addrDetails);

            setShowLocationModal(false); // Close modal on success
          } else {
            alert("Could not fetch address details.");
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
        
        let errorMessage = "Could not detect location. Please try again.";
        // Handle specific Permission Policy error
        if (error.message.includes("permissions policy")) {
            errorMessage = "Location access is disabled by browser policy. Please enter address manually.";
            setShowLocationModal(false);
        } else if (error.code === error.PERMISSION_DENIED) {
           errorMessage = "Location permission denied. Please enter address manually.";
           setShowLocationModal(false);
        } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
            errorMessage = "The request to get user location timed out.";
        }
        
        alert(errorMessage);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine apartment and address
    const fullAddress = apartment ? `${apartment}, ${address}` : address;

    const newUser: UserProfile = {
      id: phone,
      name,
      phone,
      email,
      address: fullAddress,
      deliveryInstructions,
      coordinates,
      joinedAt: Date.now()
    };

    onLoginSuccess(newUser);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-fade-in relative">
      <div className="mb-8">
        <ChefHat size={64} className="text-orange-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Welcome to</h1>
        <h2 className="text-xl font-bold text-orange-600">SARASWATHI TIFFINS</h2>
        <p className="text-gray-500 mt-2 text-sm">Authentic Homemade Food Delivery</p>
      </div>

      <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-6 shadow-sm border border-gray-100">
        {step === 'PHONE' && (
          <form onSubmit={handleContinue} className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Login / Sign Up</h3>
            <div className="text-left">
              <label className="text-xs font-bold text-gray-500 ml-1">Mobile Number</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-lg tracking-wider"
                  placeholder="99999 99999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={18} />
            </button>
          </form>
        )}

        {step === 'DETAILS' && (
          <form onSubmit={handleSaveDetails} className="space-y-4 text-left">
             <h3 className="text-lg font-bold text-gray-800 text-center mb-4">Complete Profile</h3>
             
             <div>
                <label className="text-xs font-bold text-gray-500 ml-1">Full Name</label>
                <div className="relative mt-1">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
             </div>

             <div>
                <label className="text-xs font-bold text-gray-500 ml-1">Email (Optional)</label>
                <div className="relative mt-1">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
             </div>
             
             <div>
                <label className="text-xs font-bold text-gray-500 ml-1">Delivery Instructions (Optional)</label>
                <div className="relative mt-1">
                  <MessageSquare size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    placeholder="E.g. Leave at door, Do not ring bell"
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                  />
                </div>
             </div>

             <div>
                <label className="text-xs font-bold text-gray-500 ml-1">Apartment / Society / Building</label>
                <div className="relative mt-1">
                  <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    placeholder="H.No, Building Name..."
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                  />
                </div>
             </div>

             <div>
                <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">Street / Area / Landmark</label>
                
                {/* Large Location Button */}
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  className="w-full mb-3 bg-orange-50 text-orange-700 py-3 rounded-xl border border-orange-200 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  {isLocating ? (
                    <span className="animate-pulse">Detecting Location...</span>
                  ) : (
                    <>
                      <Navigation size={18} className="fill-orange-700" />
                      Use Current Location
                    </>
                  )}
                </button>

                <textarea
                  required
                  rows={2}
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  placeholder="Street, Area, Pincode..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
             </div>

             <button 
              type="submit" 
              className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-green-200 mt-2"
            >
              Start Ordering
            </button>
          </form>
        )}
      </div>

      {/* Location Popup Modal */}
      {showLocationModal && step === 'DETAILS' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
             <div className="flex justify-between items-start mb-4">
                <div className="bg-orange-100 p-3 rounded-full">
                  <MapPin size={32} className="text-orange-600" />
                </div>
                <button 
                  onClick={() => setShowLocationModal(false)}
                  className="p-1 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500"
                >
                  <X size={20} />
                </button>
             </div>
             
             <h3 className="text-xl font-bold text-gray-900 mb-2">Set Delivery Location</h3>
             <p className="text-gray-500 text-sm mb-6">
               We need your location to show available tiffins and calculate delivery time accurately (Hyderabad Only).
             </p>

             <div className="space-y-3">
               <button 
                 onClick={handleDetectLocation}
                 disabled={isLocating}
                 className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
               >
                 {isLocating ? (
                   'Detecting...'
                 ) : (
                   <>
                     <Navigation size={20} className="fill-white" />
                     Detect My Location
                   </>
                 )}
               </button>
               
               <button 
                 onClick={() => setShowLocationModal(false)}
                 className="w-full bg-white text-gray-700 py-3 rounded-xl font-bold text-sm border border-gray-200"
               >
                 Enter Manually
               </button>
             </div>
          </div>
        </div>
      )}
      
      <p className="mt-8 text-xs text-gray-400">
        By continuing, you agree to our Terms of Service & Privacy Policy.
      </p>
    </div>
  );
};

export default Login;
