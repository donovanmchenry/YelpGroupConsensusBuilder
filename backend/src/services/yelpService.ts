import axios from 'axios';
import { config, YELP_AI_API_URL } from '../config/constants';
import { Location } from '../models/Session';

interface YelpSearchResponse {
  response: {
    text: string;
    tags: any[];
  };
  types: string[];
  entities: Array<{
    businesses?: any[];
  }>;
  chat_id: string;
}

class YelpAIService {
  private apiKey: string;

  constructor() {
    this.apiKey = config.yelpApiKey;
    if (!this.apiKey) {
      throw new Error('YELP_API_KEY is not configured');
    }
  }

  async searchRestaurants(
    query: string,
    location: Location,
    chatId?: string
  ): Promise<{ text: string; businesses: any[]; chatId: string }> {
    try {
      const response = await axios.post<YelpSearchResponse>(
        YELP_AI_API_URL,
        {
          query,
          chat_id: chatId || null,
          user_context: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const businesses = response.data.entities[0]?.businesses || [];

      return {
        text: response.data.response.text,
        businesses,
        chatId: response.data.chat_id,
      };
    } catch (error: any) {
      const apiError = error.response?.data?.error;
      const errorMessage = apiError?.description || apiError?.code || error.message || 'Failed to search restaurants';
      console.error('Yelp API error:', error.response?.data || error.message);
      throw new Error(errorMessage);
    }
  }

  async chat(query: string, chatId: string): Promise<{ text: string; chatId: string }> {
    try {
      const response = await axios.post<YelpSearchResponse>(
        YELP_AI_API_URL,
        {
          query,
          chat_id: chatId,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        text: response.data.response.text,
        chatId: response.data.chat_id,
      };
    } catch (error: any) {
      const apiError = error.response?.data?.error;
      const errorMessage = apiError?.description || apiError?.code || error.message || 'Failed to chat with Yelp AI';
      console.error('Yelp AI chat error:', error.response?.data || error.message);
      throw new Error(errorMessage);
    }
  }

  async chatWithBusinesses(query: string, chatId: string): Promise<{ text: string; businesses: any[]; chatId: string }> {
    try {
      const response = await axios.post<YelpSearchResponse>(
        YELP_AI_API_URL,
        {
          query,
          chat_id: chatId,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const businesses = response.data.entities[0]?.businesses || [];

      return {
        text: response.data.response.text,
        businesses,
        chatId: response.data.chat_id,
      };
    } catch (error: any) {
      const apiError = error.response?.data?.error;
      const errorMessage = apiError?.description || apiError?.code || error.message || 'Failed to chat with Yelp AI';
      console.error('Yelp AI chat error:', error.response?.data || error.message);
      throw new Error(errorMessage);
    }
  }

  async makeReservation(
    restaurantName: string,
    partySize: number,
    date: string,
    time: string,
    chatId?: string
  ): Promise<{ text: string; chatId: string }> {
    const query = `Book a table for ${partySize} at ${restaurantName} on ${date} at ${time}`;
    return this.chat(query, chatId || '');
  }
}

export default new YelpAIService();
