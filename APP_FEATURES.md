# YelpGroupConsensusBuilder - Detailed Feature & Functionality Overview

## Purpose & Value Proposition

**YelpGroupConsensusBuilder** is an AI-powered platform that solves the universal challenge of group dining decisions: "Where should we eat?" Instead of endless text threads and conflicting preferences, the app uses intelligent consensus algorithms and the Yelp AI API to help groups efficiently find restaurants that satisfy everyone's preferences through collaborative, real-time decision-making.

**Key Benefits:**
- Eliminates decision paralysis in group dining
- Ensures everyone's preferences are considered equally
- Provides transparent, explainable recommendations
- Enables seamless reservation completion through conversational AI

---

## Core Features

### 1. **Frictionless Group Sessions**
- **No authentication required** - participants join instantly via shareable link
- Host creates session and shares URL (`/join/{sessionId}`)
- Real-time participant tracking as people join
- 24-hour session expiry with automatic cleanup

### 2. **Comprehensive Preference Collection**
Each participant specifies:
- **Cuisine preferences**: Italian, Mexican, Chinese, Japanese, Thai, Indian, American, French, Mediterranean, Korean, Vietnamese, Greek, Pizza, Sushi, Burgers
- **Dietary restrictions**: Vegetarian, Vegan, Gluten-Free, Halal, Kosher, Dairy-Free, Nut-Free
- **Price range**: 1-4 dollar signs
- **Maximum travel distance**: 1-20 miles
- **Location**: Address autocomplete (OpenStreetMap), geolocation support, or manual lat/lng entry

### 3. **AI-Powered Consensus Algorithm**
The system intelligently analyzes all group preferences:
- Calculates geographical **centroid** from all participant locations (fairness)
- Aggregates cuisine preferences (union of all choices)
- Identifies overlapping price ranges
- Ensures restaurants satisfy **ALL** dietary restrictions
- Generates natural language search queries for Yelp AI

### 4. **Sophisticated Restaurant Scoring System**
Restaurants are scored on a 100-point weighted scale:
- **Cuisine Match (30%)**: How many group members' preferences align
- **Location Convenience (25%)**: Average distance from all participants using Haversine formula
- **Price Compatibility (20%)**: Fits within everyone's budget
- **Dietary Accommodation (25%)**: Must satisfy all dietary needs

### 5. **Transparent Match Visualization**
For each recommended restaurant, users see:
- Overall match score (0-100%)
- Individual breakdown scores for each criterion
- Restaurant details: rating, reviews, price, address, photos
- **AI-generated reasoning** explaining why it's a good match
- Animated progress bars for visual clarity

### 6. **Conversational Refinement & Discovery**
- **"Find More"**: Get additional recommendations with same preferences
- **"Find More with AI"**: Natural language queries for specific needs
  - Example: "outdoor seating with live music"
  - AI understands context and maintains conversation thread
  - Multi-turn dialogue via persistent `chat_id`
- Results accumulate rather than replace

### 7. **Conversational AI Reservation System**
- Click **"Book This Restaurant"** to initiate booking chat
- Describe party size, date, time preferences in natural language
- Yelp AI facilitates the entire booking conversation
- Ask questions about the restaurant during the process
- Context-aware, multi-turn dialogue

### 8. **Real-Time Collaboration via WebSockets**
Live updates for all participants:
- Participant count and status changes
- When members join or submit preferences
- Progress bar showing submission completion
- Instant notification when results are ready
- No page refresh required

---

## User Flows

### **Host Experience:**
1. Visit homepage and enter name
2. Create session → Receive shareable link
3. Send link to friends
4. View waiting room with live participant list
5. Submit own preferences
6. Click "Find Restaurants" when ready
7. View AI-recommended results
8. Optionally refine, load more, or book

### **Guest Experience:**
1. Receive session link from host
2. Navigate to `/join/{sessionId}`
3. Enter name and join group
4. See real-time participant count
5. Submit preferences via form
6. Wait in lobby (see others joining/submitting)
7. Auto-view results when consensus completes
8. Browse, refine, and book restaurants

---

## Technical Architecture

### **Frontend Stack**
- **React 19** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for responsive, modern UI
- **Socket.io Client** for WebSocket real-time updates
- **React Router v7** for navigation
- **Browser Geolocation API** + OpenStreetMap Nominatim for location services

### **Backend Stack**
- **Node.js + Express** with TypeScript
- **Socket.io** for WebSocket server
- **In-memory session storage** with automatic cleanup
- **Axios** for Yelp API integration
- Services architecture:
  - `sessionService`: Session lifecycle and participant management
  - `consensusService`: Core matching algorithm
  - `yelpService`: Yelp AI API wrapper with chat support

### **API Endpoints**
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions/:id/participants` - Add participant
- `POST /api/sessions/:id/preferences` - Submit preferences
- `POST /api/sessions/:id/consensus` - Calculate consensus
- `POST /api/sessions/:id/more-restaurants` - Additional recommendations
- `POST /api/sessions/:id/refine` - Natural language refinement
- `POST /api/reservations` - Conversational booking

### **WebSocket Events**
Real-time event broadcasting for session synchronization, participant updates, preference submissions, and consensus results delivery.

---

## Yelp AI Integration

The app leverages **Yelp AI Chat API v2** (`/ai/chat/v2`) for:

1. **Natural Language Search**: Converts structured preferences into conversational queries
2. **Multi-turn Conversations**: Maintains context via `chat_id` for refinement and booking
3. **Business Data**: Extracts detailed restaurant information (ratings, reviews, photos, categories)
4. **AI Reasoning**: Generates personalized explanations for why restaurants match the group
5. **Conversational Reservations**: Beta feature for chat-based bookings

**Example Query Construction:**
> "Find restaurants serving Italian, Mexican with vegetarian and gluten-free options in the $$ or $ price range near me that are highly rated"

---

## Consensus Algorithm Flow

1. **Preference Aggregation**
   - Calculate geographic centroid (average lat/lng)
   - Union all cuisine preferences
   - Collect all dietary restrictions
   - Find price range overlap
   - Determine maximum acceptable distance

2. **Search Phase**
   - Generate natural language query from aggregated data
   - Call Yelp AI API with location context
   - Receive candidate restaurants with full details

3. **Scoring Phase**
   - Calculate cuisine match percentage
   - Compute average distance from all participants (Haversine formula)
   - Verify price compatibility
   - Check dietary requirement satisfaction via keyword matching
   - Apply weighted formula to generate composite score

4. **Ranking & Explanation**
   - Sort by composite score
   - Select top 5 matches
   - Generate AI reasoning for each recommendation

5. **Refinement**
   - Maintain conversation context via `chat_id`
   - Support additional queries and specialized requests

---

## Key Technical Innovations

1. **Haversine Distance Calculation**: Accurate great-circle distance computation between coordinates
2. **Centroid-based Geography**: Finds fair geographic center instead of favoring one location
3. **Weighted Multi-factor Scoring**: Balances cuisine, distance, price, and dietary needs
4. **Stateless Chat Context**: Uses Yelp AI's `chat_id` for multi-turn conversations
5. **Real-time WebSocket Sync**: Instant updates across all participants
6. **Geocoding Integration**: Smart address autocomplete with keyboard navigation
7. **Automatic Session Cleanup**: Hourly job removes expired sessions

---

## Example Data Flow

1. Alice (host) creates session in San Francisco, prefers Italian, Vegetarian, $$, 10 miles
2. Bob joins from Oakland, prefers Mexican, Vegan, $-$$, 5 miles
3. Carol joins from Berkeley, prefers Italian, Gluten-Free, $$-$$$, 15 miles
4. Alice triggers consensus
5. System aggregates: Italian+Mexican cuisines, all 3 diets required, $$-$$$ price, 15-mile radius, centroid location
6. Yelp AI searches and returns candidates
7. Algorithm scores each restaurant against group preferences
8. Top 5 displayed with detailed match breakdowns
9. All participants see identical, synchronized results
10. Alice initiates booking conversation for party of 3

---

## Deployment

- **Frontend**: Vercel (static hosting)
- **Backend**: Render/Railway (Node.js runtime)
- **Communication**: REST API + WebSockets
- **Storage**: In-memory (suitable for short-lived sessions)
- **Authentication**: Yelp API Bearer token

---

## Summary

YelpGroupConsensusBuilder transforms group dining from a frustrating negotiation into a structured, data-driven experience where everyone's preferences are mathematically considered, results are transparent and explainable, and the entire process—from consensus to reservation—takes seconds instead of hours. Built for the Yelp AI API Hackathon 2025, it showcases advanced natural language processing, multi-turn conversation management, and intelligent business data integration.
