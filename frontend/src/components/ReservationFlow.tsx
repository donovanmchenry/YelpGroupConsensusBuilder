import { useState, useEffect, useRef } from 'react';
import type { ConsensusResult, ChatMessage } from '../types';
import { sendReservationMessage } from '../utils/api';

interface Props {
  restaurant: ConsensusResult;
  chatId?: string;
  onBack: () => void;
}

export default function ReservationFlow({ restaurant, chatId: initialChatId, onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatId, setChatId] = useState(initialChatId || '');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Initial message to start reservation - only once
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const initMessage = `I'd like to make a reservation at ${restaurant.business.name}`;
      sendInitialMessage(initMessage);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendInitialMessage = async (message: string) => {
    setMessages([{ role: 'user', text: message }]);
    setLoading(true);

    try {
      const response = await sendReservationMessage(
        message,
        chatId,
        restaurant.business.name
      );

      setChatId(response.chatId);
      setMessages(prev => [...prev, { role: 'assistant', text: response.text }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry, I encountered an error. Please try again or visit the restaurant directly.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await sendReservationMessage(
        userMessage,
        chatId,
        restaurant.business.name
      );

      setChatId(response.chatId);
      setMessages(prev => [...prev, { role: 'assistant', text: response.text }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-lg shadow-lg p-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Results
          </button>
          <div className="flex items-start gap-4">
            {restaurant.business.contextual_info?.photos?.[0] && (
              <img
                src={restaurant.business.contextual_info.photos[0].original_url}
                alt={restaurant.business.name}
                className="w-20 h-20 object-cover rounded-lg"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {restaurant.business.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-yellow-500">★</span>
                <span>{restaurant.business.rating}</span>
                <span>•</span>
                <span>{restaurant.business.price || '$$'}</span>
                <span>•</span>
                <span>{restaurant.business.categories[0]?.title}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {restaurant.business.location.formatted_address}
              </p>
            </div>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-yelp-red/70 via-orange-400/60 to-transparent rounded-full mb-2"></div>

        {/* Chat Messages */}
        <div className="bg-white shadow-lg p-6 h-96 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-yelp-red text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-yelp-red rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-gray-600">Yelp AI</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="bg-white rounded-b-lg shadow-lg p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message... (e.g., 'I need a table for 4 people tomorrow at 7 PM')"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yelp-red focus:border-transparent outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-yelp-red text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Powered by Yelp AI - Conversational restaurant reservations
          </p>
        </form>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How to book:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Tell the AI your party size, date, and time</li>
            <li>• The AI will check availability and help you complete the booking</li>
            <li>• You can ask questions about the restaurant anytime</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
