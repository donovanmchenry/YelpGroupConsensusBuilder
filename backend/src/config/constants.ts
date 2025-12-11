import dotenv from 'dotenv';

dotenv.config();

export const config = {
  yelpApiKey: process.env.YELP_API_KEY || '',
  yelpClientId: process.env.YELP_CLIENT_ID || '',
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  sessionExpiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};

export const YELP_AI_API_URL = 'https://api.yelp.com/ai/chat/v2';
