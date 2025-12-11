import axios from 'axios';
import type { Session, Participant, UserPreference } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const createSession = async (hostName: string): Promise<Session> => {
  const response = await api.post('/api/sessions', { hostName });
  return response.data;
};

export const getSession = async (sessionId: string): Promise<Session> => {
  const response = await api.get(`/api/sessions/${sessionId}`);
  return response.data;
};

export const addParticipant = async (
  sessionId: string,
  name: string
): Promise<Participant> => {
  const response = await api.post(`/api/sessions/${sessionId}/participants`, { name });
  return response.data;
};

export const submitPreferences = async (
  sessionId: string,
  participantId: string,
  preferences: UserPreference
): Promise<void> => {
  await api.post(`/api/sessions/${sessionId}/preferences`, {
    participantId,
    preferences,
  });
};

export const triggerConsensus = async (sessionId: string): Promise<any> => {
  const response = await api.post(`/api/sessions/${sessionId}/consensus`);
  return response.data;
};

export const sendReservationMessage = async (
  query: string,
  chatId: string,
  restaurant: string
): Promise<{ text: string; chatId: string }> => {
  const response = await api.post('/api/reservations', {
    query,
    chat_id: chatId,
    restaurant,
  });
  return response.data;
};

export const loadMoreRestaurants = async (
  sessionId: string,
  chatId: string
): Promise<any[]> => {
  const response = await api.post(`/api/sessions/${sessionId}/more-restaurants`, {
    chatId,
  });
  return response.data;
};

export default api;
