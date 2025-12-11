import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { config } from './config/constants';
import sessionService from './services/sessionService';
import yelpService from './services/yelpService';
import consensusService from './services/consensusService';

// Create Express app
const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

app.use(express.json());

// Configure Socket.io
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.frontendUrl,
    credentials: true,
  },
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create session endpoint
app.post('/api/sessions', (req, res) => {
  try {
    const { hostName } = req.body;
    if (!hostName) {
      return res.status(400).json({ error: 'Host name is required' });
    }

    const session = sessionService.createSession(hostName);
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get session endpoint
app.get('/api/sessions/:id', (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add participant endpoint
app.post('/api/sessions/:id/participants', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Participant name is required' });
    }

    const participant = sessionService.addParticipant(req.params.id, name);
    if (!participant) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(participant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit preferences endpoint
app.post('/api/sessions/:id/preferences', (req, res) => {
  try {
    const { participantId, preferences } = req.body;
    if (!participantId || !preferences) {
      return res.status(400).json({ error: 'Participant ID and preferences are required' });
    }

    const success = sessionService.submitPreferences(req.params.id, participantId, preferences);
    if (!success) {
      return res.status(404).json({ error: 'Session or participant not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Consensus endpoint
app.post('/api/sessions/:id/consensus', async (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get all preferences
    const preferences = session.participants
      .filter(p => p.preferences)
      .map(p => p.preferences!);

    if (preferences.length === 0) {
      return res.status(400).json({ error: 'No preferences submitted yet' });
    }

    sessionService.updateSessionStatus(req.params.id, 'analyzing');

    // Run consensus algorithm
    const { results, chatId } = await consensusService.findConsensus(preferences);

    // Save chatId and results
    sessionService.setChatId(req.params.id, chatId);
    sessionService.setConsensusResults(req.params.id, results);

    res.json({ results });
  } catch (error: any) {
    console.error('Consensus error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Load more restaurants endpoint
app.post('/api/sessions/:id/more-restaurants', async (req, res) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { chatId } = req.body;

    // Get all preferences
    const preferences = session.participants
      .filter(p => p.preferences)
      .map(p => p.preferences!);

    if (preferences.length === 0) {
      return res.status(400).json({ error: 'No preferences submitted yet' });
    }

    // Request more options from Yelp using the existing chat
    const moreResults = await consensusService.findMoreRestaurants(preferences, chatId);

    res.json(moreResults);
  } catch (error: any) {
    console.error('Load more restaurants error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reservation endpoint
app.post('/api/reservations', async (req, res) => {
  try {
    const { query, chat_id, restaurant } = req.body;

    const result = await yelpService.chat(query, chat_id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-session', (sessionId: string, participantName: string) => {
    socket.join(sessionId);
    console.log(`${participantName} joined session ${sessionId}`);

    // Broadcast to room that participant joined
    io.to(sessionId).emit('participant-joined', { participantName });
  });

  socket.on('submit-preferences', async (data: { sessionId: string; participantId: string; preferences: any }) => {
    const { sessionId, participantId, preferences } = data;

    // Save preferences
    sessionService.submitPreferences(sessionId, participantId, preferences);

    // Notify room
    io.to(sessionId).emit('preference-submitted', { participantId });

    // Check if all participants are ready
    if (sessionService.allParticipantsReady(sessionId)) {
      io.to(sessionId).emit('all-ready');
    }
  });

  socket.on('trigger-consensus', async (sessionId: string) => {
    console.log(`Triggering consensus for session ${sessionId}`);
    try {
      const session = sessionService.getSession(sessionId);
      if (!session) {
        io.to(sessionId).emit('consensus-error', { message: 'Session not found' });
        return;
      }

      // Get all preferences
      const preferences = session.participants
        .filter(p => p.preferences)
        .map(p => p.preferences!);

      if (preferences.length === 0) {
        io.to(sessionId).emit('consensus-error', { message: 'No preferences submitted yet' });
        return;
      }

      sessionService.updateSessionStatus(sessionId, 'analyzing');
      io.to(sessionId).emit('status-update', { status: 'analyzing' });

      // Run consensus algorithm
      console.log(`Running consensus for ${preferences.length} participants`);
      const { results, chatId } = await consensusService.findConsensus(preferences);
      console.log(`Consensus found ${results.length} results with chatId: ${chatId}`);

      // Save chatId and results
      sessionService.setChatId(sessionId, chatId);
      sessionService.setConsensusResults(sessionId, results);

      // Log sockets in room before emitting
      const socketsInRoom = await io.in(sessionId).fetchSockets();
      console.log(`[CONSENSUS] Emitting to ${socketsInRoom.length} sockets in room ${sessionId}`);
      socketsInRoom.forEach(s => console.log(`  - Socket ${s.id}`));

      io.to(sessionId).emit('consensus-results', { results });
      console.log('[CONSENSUS] Event emitted');
    } catch (error: any) {
      console.error('Consensus error:', error);
      sessionService.updateSessionStatus(sessionId, 'waiting');
      io.to(sessionId).emit('consensus-error', { message: error.message || 'Failed to find consensus' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

export { io };
