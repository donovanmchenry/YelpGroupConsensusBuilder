import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../utils/api';
import { usePageTransition } from '../hooks/usePageTransition';

export default function CreateSession() {
  const [hostName, setHostName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const transitionClass = usePageTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;

    setLoading(true);
    try {
      const session = await createSession(hostName.trim());
      navigate(`/session/${session.id}`, { state: { session } });
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${transitionClass}`}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Group Consensus Builder
          </h1>
          <p className="text-lg text-gray-600">
            Solve "where should we eat?" with AI
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="hostName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Name
              </label>
              <input
                type="text"
                id="hostName"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yelp-red focus:border-transparent outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !hostName.trim()}
              className="w-full bg-yelp-red text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Group Session'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Powered by Yelp AI API
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
