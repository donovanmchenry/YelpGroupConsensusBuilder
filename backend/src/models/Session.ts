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
  priceRange: number[];  // [1, 2] = $ or $$
  maxDistance: number;   // Miles
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
  expiresAt: Date;
  status: SessionStatus;
  participants: Participant[];
  consensusResults?: ConsensusResult[];
  chatId?: string;
}

export interface ConsensusResult {
  business: any;  // Yelp business object
  matchScore: number;
  matchDetails: {
    cuisineMatch: number;
    locationMatch: number;
    priceMatch: number;
    dietaryMatch: number;
  };
  reasoningText: string;
}
