import { v4 as uuidv4 } from 'uuid';
import { Session, Participant, UserPreference } from '../models/Session';
import { config } from '../config/constants';

class SessionService {
  private sessions: Map<string, Session> = new Map();

  constructor() {
    // Start cleanup interval to remove expired sessions
    setInterval(() => this.cleanupExpiredSessions(), 60 * 60 * 1000); // Every hour
  }

  createSession(hostName: string): Session {
    const hostParticipant: Participant = {
      id: uuidv4(),
      name: hostName,
      joinedAt: new Date(),
      hasSubmitted: false,
    };

    const session: Session = {
      id: uuidv4(),
      hostName,
      hostParticipantId: hostParticipant.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + config.sessionExpiryHours * 60 * 60 * 1000),
      status: 'collecting',
      participants: [hostParticipant],
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  addParticipant(sessionId: string, participantName: string): Participant | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const participant: Participant = {
      id: uuidv4(),
      name: participantName,
      joinedAt: new Date(),
      hasSubmitted: false,
    };

    session.participants.push(participant);
    session.status = 'collecting';
    return participant;
  }

  submitPreferences(sessionId: string, participantId: string, preferences: UserPreference): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const participant = session.participants.find(p => p.id === participantId);
    if (!participant) return false;

    participant.preferences = preferences;
    participant.hasSubmitted = true;

    return true;
  }

  allParticipantsReady(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.participants.length === 0) return false;

    return session.participants.every(p => p.hasSubmitted);
  }

  updateSessionStatus(sessionId: string, status: Session['status']): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
    }
  }

  setChatId(sessionId: string, chatId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.chatId = chatId;
    }
  }

  setConsensusResults(sessionId: string, results: any[]): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.consensusResults = results;
      session.status = 'completed';
    }
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

export default new SessionService();
