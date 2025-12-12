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
}

export default function PreferenceForm({ sessionId, participantId, participantName, socket }: Props) {
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<number[]>([1, 2]);
  const [maxDistance, setMaxDistance] = useState(10);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
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
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Current Location',
          });
          setGettingLocation(false);
        },
        () => {
          // Default to San Francisco if location denied
          setLocation({
            lat: 37.7749,
            lng: -122.4194,
            address: 'San Francisco, CA',
          });
          setGettingLocation(false);
        }
      );
    }
  }, []);

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

      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit preferences:', error);
      alert('Failed to submit preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
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
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Location</p>
                <p className="text-sm text-gray-600">
                  {gettingLocation ? 'Getting location...' : location?.address || 'Unknown'}
                </p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
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
