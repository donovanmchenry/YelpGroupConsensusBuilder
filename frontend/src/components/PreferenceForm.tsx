import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import type { UserPreference } from '../types';
import { CUISINE_OPTIONS, DIETARY_OPTIONS } from '../types';
import { submitPreferences } from '../utils/api';
import WaitingRoom from './WaitingRoom';
import { usePageTransition } from '../hooks/usePageTransition';

interface Props {
  sessionId: string;
  participantId: string;
  participantName: string;
  socket: Socket | null;
  hideWaitingRoom?: boolean;
  onSubmitSuccess?: (preferences: UserPreference) => void;
}

export default function PreferenceForm({
  sessionId,
  participantId,
  participantName,
  socket,
  hideWaitingRoom = false,
  onSubmitSuccess,
}: Props) {
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<number[]>([1, 2]);
  const [maxDistance, setMaxDistance] = useState(10);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const transitionClass = usePageTransition();

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Current Location',
          };
          setLocation(loc);
          setAddressInput(loc.address);
          setGettingLocation(false);
        },
        () => {
          // Default to San Francisco if location denied
          const loc = {
            lat: 37.7749,
            lng: -122.4194,
            address: 'San Francisco, CA',
          };
          setLocation(loc);
          setAddressInput(loc.address);
          setGettingLocation(false);
        }
      );
    }
  }, []);

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      setGettingLocation(true);
      setShowSuggestions(false);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Current Location',
          };
          setLocation(loc);
          setAddressInput(loc.address);
          setGettingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Failed to get current location. Please enter an address manually.');
          setGettingLocation(false);
        }
      );
    }
  };

  const searchAddressSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${encodeURIComponent(query)}&` +
        `limit=10&` +
        `addressdetails=1&` +
        `countrycodes=us`, // Focus on US addresses, remove if you need international
        {
          headers: {
            'User-Agent': 'YelpGroupConsensusBuilder/1.0'
          }
        }
      );
      const data = await response.json();

      setAddressSuggestions(data);
      setShowSuggestions(data.length > 0);
      setSelectedSuggestionIndex(-1);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectAddress = (suggestion: { display_name: string; lat: string; lon: string }) => {
    const loc = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
      address: suggestion.display_name,
    };
    setLocation(loc);
    setAddressInput(suggestion.display_name);
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  // Debounce address search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (addressInput) {
        searchAddressSuggestions(addressInput);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [addressInput]);

  const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || addressSuggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        setShowSuggestions(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < addressSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < addressSuggestions.length) {
          selectAddress(addressSuggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const toggleCuisine = (cuisine: string) => {
    setCuisines(prev =>
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const toggleDietary = (restriction: string) => {
    setDietary(prev =>
      prev.includes(restriction)
        ? prev.filter(d => d !== restriction)
        : [...prev, restriction]
    );
  };

  const togglePrice = (price: number) => {
    setPriceRange(prev =>
      prev.includes(price)
        ? prev.filter(p => p !== price)
        : [...prev, price].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || cuisines.length === 0) return;

    setLoading(true);
    try {
      const preferences: UserPreference = {
        participantId,
        cuisines,
        location: {
          latitude: location.lat,
          longitude: location.lng,
          address: location.address,
        },
        dietaryRestrictions: dietary,
        priceRange,
        maxDistance,
      };

      await submitPreferences(sessionId, participantId, preferences);

      // Emit socket event
      if (socket) {
        socket.emit('submit-preferences', {
          sessionId,
          participantId,
          preferences,
        });
      }

      onSubmitSuccess?.(preferences);
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit preferences:', error);
      alert('Failed to submit preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    if (hideWaitingRoom) {
      return null;
    }
    return (
      <WaitingRoom
        sessionId={sessionId}
        participantId={participantId}
        participantName={participantName}
        socket={socket}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-8 px-4 ${transitionClass}`}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            What are you in the mood for?
          </h1>
          <p className="text-gray-600">
            Share your preferences, {participantName}!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          {/* Cuisines */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Cuisines (select at least one)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CUISINE_OPTIONS.map(cuisine => (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => toggleCuisine(cuisine)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    cuisines.includes(cuisine)
                      ? 'border-yelp-red bg-yelp-red text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-yelp-red'
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>

          {/* Dietary Restrictions */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Dietary Restrictions (optional)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {DIETARY_OPTIONS.map(restriction => (
                <button
                  key={restriction}
                  type="button"
                  onClick={() => toggleDietary(restriction)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    dietary.includes(restriction)
                      ? 'border-yelp-red bg-yelp-red text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-yelp-red'
                  }`}
                >
                  {restriction}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Price Range
            </label>
            <div className="flex gap-3">
              {[1, 2, 3, 4].map(price => (
                <button
                  key={price}
                  type="button"
                  onClick={() => togglePrice(price)}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 text-xl font-semibold transition-all ${
                    priceRange.includes(price)
                      ? 'border-yelp-red bg-yelp-red text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-yelp-red'
                  }`}
                >
                  {'$'.repeat(price)}
                </button>
              ))}
            </div>
          </div>

          {/* Max Distance */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Maximum Distance: {maxDistance} miles
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={maxDistance}
              onChange={(e) => setMaxDistance(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yelp-red"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 mi</span>
              <span>20 mi</span>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Location
            </label>
            <div className="relative">
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onKeyDown={handleAddressKeyDown}
                onFocus={() => {
                  if (addressSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay to allow clicking on suggestions
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="Enter an address or use current location"
                disabled={gettingLocation}
                className="w-full px-4 py-3 pr-36 border-2 border-gray-300 rounded-lg focus:border-yelp-red focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={gettingLocation}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-yelp-red text-white text-sm font-medium rounded hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {gettingLocation ? 'Loading...' : 'Use Current'}
              </button>

              {/* Dropdown suggestions */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectAddress(suggestion)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-200 last:border-b-0 transition-colors ${
                        index === selectedSuggestionIndex ? 'bg-gray-100' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-yelp-red shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm text-gray-800">{suggestion.display_name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {location && (
              <p className="mt-2 text-xs text-gray-600">
                <span className="font-medium">Current:</span> {location.address}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || cuisines.length === 0 || !location || priceRange.length === 0}
            className="w-full bg-yelp-red text-white py-4 rounded-lg font-semibold text-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit My Preferences'}
          </button>
        </form>
      </div>
    </div>
  );
}
