import { useState, useEffect } from 'react';
import type { ConsensusResult } from '../types';
import ReservationFlow from './ReservationFlow';
import { loadMoreRestaurants } from '../utils/api';

interface Props {
  results: ConsensusResult[];
  sessionId: string;
  chatId?: string;
}

export default function ConsensusResults({ results: initialResults, sessionId, chatId }: Props) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<ConsensusResult | null>(null);
  const [results, setResults] = useState<ConsensusResult[]>(initialResults);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setResults(initialResults);
  }, [initialResults]);

  const handleLoadMore = async () => {
    console.log('[LOAD MORE] Button clicked');
    console.log('[LOAD MORE] sessionId:', sessionId);
    console.log('[LOAD MORE] chatId:', chatId);

    if (!chatId) {
      console.error('[LOAD MORE] No chatId available!');
      alert('Cannot load more restaurants: No chat session found. Please try finding restaurants again.');
      setHasMore(false);
      return;
    }

    setLoading(true);
    try {
      console.log('[LOAD MORE] Calling API...');
      const moreResults = await loadMoreRestaurants(sessionId, chatId);
      console.log('[LOAD MORE] Got results:', moreResults.length);

      if (moreResults.length === 0) {
        setHasMore(false);
        alert('No more restaurants found. Try adjusting your preferences.');
      } else {
        setResults(prev => [...prev, ...moreResults]);
      }
    } catch (error: any) {
      console.error('[LOAD MORE] Failed to load more restaurants:', error);
      const message = error?.response?.data?.error || error?.message || 'Failed to load more restaurants. Please try again.';
      alert(message);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  if (selectedRestaurant) {
    return (
      <ReservationFlow
        restaurant={selectedRestaurant}
        chatId={chatId}
        onBack={() => setSelectedRestaurant(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Perfect Matches Found!
          </h1>
          <p className="text-gray-600">
            AI-powered recommendations based on your group's preferences
          </p>
        </div>

        <div className="space-y-6">
          {results.map((result, index) => (
            <div
              key={result.business.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              style={{
                animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`
              }}
            >
              <div className="md:flex">
                {/* Image */}
                <div className="md:w-1/3 h-64 md:h-auto bg-gray-200 relative">
                  {result.business.contextual_info?.photos?.[0] ? (
                    <img
                      src={result.business.contextual_info.photos[0].original_url}
                      alt={result.business.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Match Score Badge */}
                  <div className="absolute top-4 left-4 bg-yelp-red text-white px-4 py-2 rounded-full font-bold text-lg shadow-lg">
                    {result.matchScore}% Match
                  </div>
                  {/* Rank Badge */}
                  <div className="absolute top-4 right-4 bg-white text-gray-900 w-10 h-10 rounded-full font-bold text-lg shadow-lg flex items-center justify-center">
                    #{index + 1}
                  </div>
                </div>

                {/* Content */}
                <div className="md:w-2/3 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {result.business.name}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span className="font-semibold">{result.business.rating}</span>
                          <span>({result.business.review_count} reviews)</span>
                        </div>
                        {result.business.price && (
                          <span className="font-semibold text-yelp-red">
                            {result.business.price}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {result.business.categories.slice(0, 3).map(cat => (
                          <span
                            key={cat.alias}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                          >
                            {cat.title}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {result.business.location.formatted_address}
                      </p>
                    </div>
                  </div>

                  {/* Match Details */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Cuisine</span>
                        <span>{result.matchDetails.cuisineMatch}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${result.matchDetails.cuisineMatch}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Location</span>
                        <span>{result.matchDetails.locationMatch}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${result.matchDetails.locationMatch}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Price</span>
                        <span>{result.matchDetails.priceMatch}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${result.matchDetails.priceMatch}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Dietary</span>
                        <span>{result.matchDetails.dietaryMatch}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{ width: `${result.matchDetails.dietaryMatch}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* AI Reasoning */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900 mb-1">AI Insight</p>
                        <p className="text-sm text-blue-800">{result.reasoningText}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedRestaurant(result)}
                      className="flex-1 bg-yelp-red text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                      Book This Restaurant
                    </button>
                    <a
                      href={result.business.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gray-200 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-center"
                    >
                      View on Yelp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-8 py-4 bg-yelp-red text-white rounded-lg font-semibold text-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-yelp-red rounded-full animate-spin"></div>
                  Finding More Options...
                </span>
              ) : (
                'Load More Restaurants'
              )}
            </button>
          </div>
        )}

        {!hasMore && results.length > initialResults.length && (
          <div className="mt-8 text-center text-gray-500">
            <p>No more restaurants match your preferences</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
