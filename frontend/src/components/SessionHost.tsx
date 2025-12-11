import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getSession } from '../utils/api';
import { useSocket } from '../hooks/useSocket';
import type { Session } from '../types';
import ShareLink from './ShareLink';
import ConsensusResults from './ConsensusResults';
import PreferenceForm from './PreferenceForm';

export default function SessionHost() {
  const { id: sessionId } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket(sessionId);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await getSession(sessionId);
      setSession(data);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId, loadSession]);

  // Explicitly join socket room with host name when session loads
  useEffect(() => {
    if (socket && session && sessionId) {
      console.log('[HOST] Joining socket room as:', session.hostName);
      socket.emit('join-session', sessionId, session.hostName);
    }
  }, [socket, session?.hostName, sessionId]);

  useEffect(() => {
    if (!socket) return;

    console.log('[HOST] Setting up socket listeners');

    const handleParticipantJoined = () => {
      console.log('[HOST] participant-joined event');
      loadSession();
    };

    const handlePreferenceSubmitted = () => {
      console.log('[HOST] preference-submitted event');
      loadSession();
    };

    const handleAllReady = () => {
      console.log('[HOST] all-ready event');
      loadSession();
    };

    const handleConsensusResults = (data: any) => {
      console.log('[HOST] consensus-results event received!', data);
      setLoading(false);
      loadSession();
    };

    const handleStatusUpdate = () => {
      console.log('[HOST] status-update event');
      loadSession();
    };

    const handleConsensusError = (data: { message: string }) => {
      console.error('[HOST] consensus-error:', data.message);
      setLoading(false);
      alert(`Failed to find restaurants: ${data.message}. Please try again.`);
      loadSession();
    };

    socket.on('participant-joined', handleParticipantJoined);
    socket.on('preference-submitted', handlePreferenceSubmitted);
    socket.on('all-ready', handleAllReady);
    socket.on('consensus-results', handleConsensusResults);
    socket.on('status-update', handleStatusUpdate);
    socket.on('consensus-error', handleConsensusError);

    return () => {
      console.log('[HOST] Cleaning up socket listeners');
      socket.off('participant-joined', handleParticipantJoined);
      socket.off('preference-submitted', handlePreferenceSubmitted);
      socket.off('all-ready', handleAllReady);
      socket.off('consensus-results', handleConsensusResults);
      socket.off('status-update', handleStatusUpdate);
      socket.off('consensus-error', handleConsensusError);
    };
  }, [socket, loadSession]);

  const handleFindRestaurants = () => {
    if (!socket || !sessionId) return;
    setLoading(true);
    socket.emit('trigger-consensus', sessionId);
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-yelp-red rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  // Show results if available
  if (session.consensusResults && session.consensusResults.length > 0) {
    return (
      <ConsensusResults
        results={session.consensusResults}
        sessionId={sessionId || ''}
        chatId={session.chatId}
      />
    );
  }

  // Check if host has submitted preferences
  const hostParticipant = session.participants.find(p => p.id === session.hostParticipantId);
  if (hostParticipant && !hostParticipant.hasSubmitted) {
    return (
      <PreferenceForm
        sessionId={sessionId || ''}
        participantId={hostParticipant.id}
        participantName={session.hostName}
        socket={socket}
      />
    );
  }

  const submittedCount = session.participants.filter(p => p.hasSubmitted).length;
  const totalCount = session.participants.length;
  const allReady = totalCount > 0 && submittedCount === totalCount;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Group Session
          </h1>
          <p className="text-gray-600">
            Host: {session.hostName}
          </p>
        </div>

        <div className="space-y-6">
          {/* Share Link */}
          {sessionId && <ShareLink sessionId={sessionId} />}

          {/* Progress */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Group Progress</span>
                <span className="text-sm font-semibold text-yelp-red">
                  {submittedCount} / {totalCount} ready
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-yelp-red h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(submittedCount / Math.max(totalCount, 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Participants List */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Participants ({totalCount})
              </h2>
              {session.participants.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Waiting for people to join...
                </p>
              ) : (
                session.participants.map(participant => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                        participant.hasSubmitted ? 'bg-green-500' : 'bg-gray-400'
                      }`}>
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{participant.name}</span>
                    </div>
                    {participant.hasSubmitted ? (
                      <span className="flex items-center gap-2 text-green-600 font-medium">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Submitted
                      </span>
                    ) : (
                      <span className="text-gray-500 text-sm">Waiting...</span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Find Restaurants Button */}
            {allReady && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleFindRestaurants}
                  disabled={loading || session.status === 'analyzing'}
                  className="w-full bg-yelp-red text-white py-4 rounded-lg font-semibold text-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading || session.status === 'analyzing' ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Finding Perfect Matches...
                    </span>
                  ) : (
                    'Find Restaurants'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
