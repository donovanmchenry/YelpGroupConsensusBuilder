import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { getSession } from '../utils/api';
import type { Session } from '../types';
import ConsensusResults from './ConsensusResults';

interface Props {
  sessionId: string;
  participantId: string;
  participantName: string;
  socket: Socket | null;
}

export default function WaitingRoom({ sessionId, participantId, participantName, socket }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('participant-joined', () => {
      loadSession();
    });

    socket.on('preference-submitted', () => {
      loadSession();
    });

    socket.on('consensus-results', () => {
      setShowResults(true);
      loadSession();
    });

    return () => {
      socket.off('participant-joined');
      socket.off('preference-submitted');
      socket.off('consensus-results');
    };
  }, [socket]);

  const loadSession = async () => {
    try {
      const data = await getSession(sessionId);
      setSession(data);
      if (data.consensusResults && data.consensusResults.length > 0) {
        setShowResults(true);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  if (showResults && session?.consensusResults) {
    return (
      <ConsensusResults
        results={session.consensusResults}
        sessionId={sessionId}
        chatId={session.chatId}
      />
    );
  }

  const submittedCount = session?.participants.filter(p => p.hasSubmitted).length || 0;
  const totalCount = session?.participants.length || 0;
  const allReady = totalCount > 0 && submittedCount === totalCount;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Preferences Submitted!
          </h1>
          <p className="text-gray-600">
            Waiting for others to finish...
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Group Progress</span>
              <span className="text-sm font-semibold text-yelp-red">
                {submittedCount} / {totalCount}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-yelp-red h-3 rounded-full transition-all duration-500"
                style={{ width: `${(submittedCount / Math.max(totalCount, 1)) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
            {session?.participants.map(participant => (
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
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-6 h-6 border-4 border-gray-300 border-t-yelp-red rounded-full animate-spin"></div>
                )}
              </div>
            ))}
          </div>

          {allReady && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-semibold text-center">
                Everyone's ready! The host will start finding restaurants...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
