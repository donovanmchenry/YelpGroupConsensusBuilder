import { UserPreference, Location, ConsensusResult } from '../models/Session';
import yelpService from './yelpService';

class ConsensusService {
  /**
   * Main consensus algorithm - finds best restaurant matches for a group
   */
  async findConsensus(preferences: UserPreference[]): Promise<{ results: ConsensusResult[]; chatId: string }> {
    if (preferences.length === 0) {
      throw new Error('No preferences provided');
    }

    // Step 1: Analyze group requirements
    const groupRequirements = this.analyzeGroupPreferences(preferences);

    // Step 2: Build Yelp AI query
    const query = this.buildConsensusQuery(groupRequirements);

    // Step 3: Search with Yelp AI
    const { businesses, chatId } = await yelpService.searchRestaurants(
      query,
      groupRequirements.centroid
    );

    if (businesses.length === 0) {
      return { results: [], chatId };
    }

    // Step 4: Score each restaurant
    const scored = businesses.map(business => ({
      business,
      matchScore: this.calculateMatchScore(business, preferences),
      matchDetails: this.calculateMatchDetails(business, preferences),
      reasoningText: '', // Will be filled by AI
    }));

    // Step 5: Sort by score and take top 5
    const top5 = scored
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    // Step 6: Add AI reasoning for top matches
    const withReasoning = await this.addAIReasoning(top5, groupRequirements, chatId);

    return { results: withReasoning, chatId };
  }

  /**
   * Analyzes all preferences to extract group requirements
   */
  private analyzeGroupPreferences(preferences: UserPreference[]) {
    // Calculate geographical centroid
    const centroid = this.calculateCentroid(preferences.map(p => p.location));

    // Aggregate all cuisines (union)
    const allCuisines = [...new Set(preferences.flatMap(p => p.cuisines))];

    // Aggregate dietary restrictions (must satisfy ALL)
    const allDietary = [...new Set(preferences.flatMap(p => p.dietaryRestrictions))];

    // Find price range overlap
    const priceRange = this.findPriceOverlap(preferences);

    // Calculate max acceptable distance
    const maxDistance = Math.max(...preferences.map(p => p.maxDistance));

    return {
      centroid,
      cuisines: allCuisines,
      dietaryRestrictions: allDietary,
      priceRange,
      maxDistance,
      participantCount: preferences.length,
    };
  }

  /**
   * Calculates geographical centroid of all user locations
   */
  private calculateCentroid(locations: Location[]): Location {
    const avgLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length;
    const avgLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length;

    return {
      latitude: avgLat,
      longitude: avgLng,
      address: 'Group Center',
    };
  }

  /**
   * Finds price range that works for most participants
   */
  private findPriceOverlap(preferences: UserPreference[]): number[] {
    // Get all unique price levels mentioned
    const allPrices = new Set<number>();
    preferences.forEach(p => p.priceRange.forEach(price => allPrices.add(price)));

    // Sort and return as array
    return Array.from(allPrices).sort();
  }

  /**
   * Builds natural language query for Yelp AI
   */
  private buildConsensusQuery(groupReqs: any): string {
    const parts: string[] = [];

    // Start with cuisines
    if (groupReqs.cuisines.length > 0) {
      const cuisineList = groupReqs.cuisines.slice(0, 5).join(', ');
      parts.push(`restaurants serving ${cuisineList}`);
    } else {
      parts.push('restaurants');
    }

    // Add dietary restrictions
    if (groupReqs.dietaryRestrictions.length > 0) {
      const dietaryList = groupReqs.dietaryRestrictions.join(' and ');
      parts.push(`with ${dietaryList} options`);
    }

    // Add price range
    if (groupReqs.priceRange.length > 0) {
      const maxPrice = Math.max(...groupReqs.priceRange);
      const priceSymbols = '$'.repeat(maxPrice);
      parts.push(`in the ${priceSymbols} or lower price range`);
    }

    // Add location
    parts.push('near me');

    // Ask for top rated
    parts.push('that are highly rated');

    return `Find ${parts.join(' ')}`;
  }

  /**
   * Calculates match score (0-100) for a restaurant
   */
  private calculateMatchScore(business: any, preferences: UserPreference[]): number {
    let score = 0;

    // Cuisine matching (30 points)
    const cuisineMatches = preferences.filter(p =>
      p.cuisines.some(cuisine =>
        business.categories?.some((cat: any) =>
          cat.alias?.toLowerCase().includes(cuisine.toLowerCase()) ||
          cat.title?.toLowerCase().includes(cuisine.toLowerCase())
        )
      )
    ).length;
    score += (cuisineMatches / preferences.length) * 30;

    // Location scoring (25 points)
    const avgDistance = this.calculateAverageDistance(business, preferences);
    const maxAcceptable = Math.max(...preferences.map(p => p.maxDistance));
    const locationScore = Math.max(0, (1 - avgDistance / maxAcceptable)) * 25;
    score += locationScore;

    // Price matching (20 points)
    const priceLevel = business.price?.length || 2;
    const priceMatches = preferences.filter(p =>
      p.priceRange.includes(priceLevel)
    ).length;
    score += (priceMatches / preferences.length) * 20;

    // Dietary restrictions (25 points)
    const allDietary = [...new Set(preferences.flatMap(p => p.dietaryRestrictions))];
    const canSatisfyDietary = this.checkDietaryCompatibility(business, allDietary);
    score += canSatisfyDietary ? 25 : 0;

    return Math.round(score);
  }

  /**
   * Calculates detailed match breakdown
   */
  private calculateMatchDetails(business: any, preferences: UserPreference[]) {
    const cuisineMatches = preferences.filter(p =>
      p.cuisines.some(cuisine =>
        business.categories?.some((cat: any) =>
          cat.alias?.toLowerCase().includes(cuisine.toLowerCase()) ||
          cat.title?.toLowerCase().includes(cuisine.toLowerCase())
        )
      )
    ).length;

    const avgDistance = this.calculateAverageDistance(business, preferences);
    const maxDistance = Math.max(...preferences.map(p => p.maxDistance));
    const locationScore = Math.max(0, Math.round((1 - avgDistance / maxDistance) * 100));

    const priceLevel = business.price?.length || 2;
    const priceMatches = preferences.filter(p =>
      p.priceRange.includes(priceLevel)
    ).length;

    const allDietary = [...new Set(preferences.flatMap(p => p.dietaryRestrictions))];
    const dietaryScore = this.checkDietaryCompatibility(business, allDietary) ? 100 : 0;

    return {
      cuisineMatch: Math.round((cuisineMatches / preferences.length) * 100),
      locationMatch: locationScore,
      priceMatch: Math.round((priceMatches / preferences.length) * 100),
      dietaryMatch: dietaryScore,
    };
  }

  /**
   * Calculates average distance from restaurant to all participants
   */
  private calculateAverageDistance(business: any, preferences: UserPreference[]): number {
    const bizLat = business.coordinates?.latitude;
    const bizLng = business.coordinates?.longitude;

    if (!bizLat || !bizLng) return 999; // Unknown location = far away

    const distances = preferences.map(p =>
      this.calculateDistance(
        p.location.latitude,
        p.location.longitude,
        bizLat,
        bizLng
      )
    );

    return distances.reduce((sum, d) => sum + d, 0) / distances.length;
  }

  /**
   * Haversine formula to calculate distance between two coordinates (in miles)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Checks if restaurant can satisfy dietary restrictions
   */
  private checkDietaryCompatibility(business: any, restrictions: string[]): boolean {
    if (restrictions.length === 0) return true;

    // Check business attributes and categories
    const businessText = JSON.stringify(business).toLowerCase();

    // Simple keyword matching (can be enhanced with Yelp AI)
    return restrictions.every(restriction => {
      const keyword = restriction.toLowerCase();
      return businessText.includes(keyword) ||
        businessText.includes(keyword.replace('-', ' ')) ||
        businessText.includes(keyword.replace(' ', ''));
    });
  }

  /**
   * Uses Yelp AI to generate reasoning for why restaurants are good matches
   */
  private async addAIReasoning(
    results: ConsensusResult[],
    groupReqs: any,
    chatId: string
  ): Promise<ConsensusResult[]> {
    // Generate reasoning for each top result
    const withReasoning = await Promise.all(
      results.map(async (result) => {
        try {
          const cuisineList = groupReqs.cuisines.join(', ');
          const dietaryList = groupReqs.dietaryRestrictions.join(', ');

          const reasoningQuery = `Why is ${result.business.name} a good match for a group of ${groupReqs.participantCount} people wanting ${cuisineList || 'various'} cuisine${dietaryList ? ` with ${dietaryList} dietary needs` : ''}?`;

          const { text } = await yelpService.chat(reasoningQuery, chatId);

          return {
            ...result,
            reasoningText: text,
          };
        } catch (error) {
          // Fallback reasoning if AI fails
          return {
            ...result,
            reasoningText: `${result.business.name} matches ${result.matchScore}% of your group's preferences with a ${result.business.rating} star rating.`,
          };
        }
      })
    );

    return withReasoning;
  }

  /**
   * Finds more restaurant options using the existing chat context
   */
  async findMoreRestaurants(preferences: UserPreference[], chatId: string): Promise<ConsensusResult[]> {
    if (preferences.length === 0) {
      throw new Error('No preferences provided');
    }

    // Analyze group requirements
    const groupRequirements = this.analyzeGroupPreferences(preferences);

    // Ask for more options using the existing chat
    const moreQuery = "Can you suggest 5 more restaurant options similar to the previous ones? Please provide different options that still match the group's preferences.";

    const { businesses } = await yelpService.chatWithBusinesses(moreQuery, chatId);

    if (businesses.length === 0) {
      return [];
    }

    // Score each restaurant
    const scored = businesses.map((business: any) => ({
      business,
      matchScore: this.calculateMatchScore(business, preferences),
      matchDetails: this.calculateMatchDetails(business, preferences),
      reasoningText: '', // Will be filled by AI
    }));

    // Sort by score and take top 5
    const top5 = scored
      .sort((a: any, b: any) => b.matchScore - a.matchScore)
      .slice(0, 5);

    // Add AI reasoning for matches
    const withReasoning = await this.addAIReasoning(top5, groupRequirements, chatId);

    return withReasoning;
  }

  /**
   * Refines results based on user's natural language description
   */
  async refineResults(preferences: UserPreference[], userQuery: string, chatId: string): Promise<ConsensusResult[]> {
    if (preferences.length === 0) {
      throw new Error('No preferences provided');
    }

    // Analyze group requirements
    const groupRequirements = this.analyzeGroupPreferences(preferences);

    // Build refined query that incorporates user's natural language request
    const refinedQuery = `Based on our previous conversation about restaurants, I'd like to find additional options. ${userQuery}. Please suggest 5 more restaurants that match this description while still considering our group's preferences. Try to suggest different restaurants we haven't seen yet.`;

    const { businesses } = await yelpService.chatWithBusinesses(refinedQuery, chatId);

    if (businesses.length === 0) {
      return [];
    }

    // Score each restaurant
    const scored = businesses.map((business: any) => ({
      business,
      matchScore: this.calculateMatchScore(business, preferences),
      matchDetails: this.calculateMatchDetails(business, preferences),
      reasoningText: '', // Will be filled by AI
    }));

    // Sort by score and take top 5
    const top5 = scored
      .sort((a: any, b: any) => b.matchScore - a.matchScore)
      .slice(0, 5);

    // Add AI reasoning for matches
    const withReasoning = await this.addAIReasoning(top5, groupRequirements, chatId);

    return withReasoning;
  }
}

export default new ConsensusService();
