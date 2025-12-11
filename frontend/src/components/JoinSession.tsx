import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession, addParticipant } from '../utils/api';
import { useSocket } from '../hooks/useSocket';
import PreferenceForm from './PreferenceForm';

export default function JoinSession() {
  const { id: sessionId } = useParams<{ id: string }>();
  const [participantName, setParticipantName] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionExists, setSessionExists] = useState<boolean | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const { socket } = useSocket(sessionId);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionId) {
      getSession(sessionId)
        .then(() => setSessionExists(true))
        .catch(() => setSessionExists(false));
    }
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantName.trim() || !sessionId) return;

    setLoading(true);
    try {
      const participant = await addParticipant(sessionId, participantName.trim());
      setParticipantId(participant.id);

      // Join socket room
      if (socket) {
        socket.emit('join-session', sessionId, participantName.trim());
      }

      setHasJoined(true);
    } catch (error) {
      console.error('Failed to join session:', error);
      alert('Failed to join session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sessionExists === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Session Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              This session doesn't exist or has expired.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-yelp-red text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Create New Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hasJoined && participantId && sessionId) {
    return (
      <PreferenceForm
        sessionId={sessionId}
        participantId={participantId}
        participantName={participantName}
        socket={socket}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Join Group Session
          </h1>
          <p className="text-lg text-gray-600">
            Help decide where to eat!
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="participantName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Name
              </label>
              <input
                type="text"
                id="participantName"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yelp-red focus:border-transparent outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !participantName.trim()}
              className="w-full bg-yelp-red text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Join Group'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
