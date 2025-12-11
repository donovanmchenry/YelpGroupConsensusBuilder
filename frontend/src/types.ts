export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface UserPreference {
  participantId: string;
  cuisines: string[];
  location: Location;
  dietaryRestrictions: string[];
  priceRange: number[];
  maxDistance: number;
  partySize?: number;
  preferredDate?: string;
  preferredTime?: string;
}

export interface Participant {
  id: string;
  name: string;
  joinedAt: Date;
  hasSubmitted: boolean;
  preferences?: UserPreference;
}

export type SessionStatus = 'waiting' | 'collecting' | 'analyzing' | 'completed';

export interface Session {
  id: string;
  hostName: string;
  hostParticipantId: string;
  createdAt: Date;
  status: SessionStatus;
  participants: Participant[];
  consensusResults?: ConsensusResult[];
  chatId?: string;
}

export interface ConsensusResult {
  business: YelpBusiness;
  matchScore: number;
  matchDetails: {
    cuisineMatch: number;
    locationMatch: number;
    priceMatch: number;
    dietaryMatch: number;
  };
  reasoningText: string;
}

export interface YelpBusiness {
  id: string;
  name: string;
  url: string;
  rating: number;
  review_count: number;
  price?: string;
  phone?: string;
  location: {
    address1: string;
    city: string;
    state: string;
    zip_code: string;
    formatted_address: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  categories: Array<{
    alias: string;
    title: string;
  }>;
  photos?: string[];
  summaries?: {
    short?: string;
    medium?: string;
    long?: string;
  };
  contextual_info?: {
    photos?: Array<{ original_url: string }>;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export const CUISINE_OPTIONS = [
  'Italian',
  'Mexican',
  'Chinese',
  'Japanese',
  'Thai',
  'Indian',
  'American',
  'French',
  'Mediterranean',
  'Korean',
  'Vietnamese',
  'Greek',
  'Pizza',
  'Sushi',
  'Burgers',
];

export const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Halal',
  'Kosher',
  'Dairy-Free',
  'Nut-Free',
];
