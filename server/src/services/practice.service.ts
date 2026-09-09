/**
 * @file practice.service.ts
 * @description Service Layer for Flashcard Practice Domain — Manages practice sessions, confidence-weighted card ordering, confidence recording, and progress statistics.
 * @module Services/PracticeService
 */

import { PracticeSession } from '../models/PracticeSession.js';
import { Kit } from '../models/Kit.js';
import { AppError } from '../middleware/errorHandler.js';
import { isMongoConnected, inMemoryStore } from '../utils/inMemoryDb.js';

export class PracticeService {
  /**
   * Starts a new practice session for a prep kit, ordering flashcards by confidence ascending (least-confident first).
   * 
   * @param {string} kitId - Unique ID of target kit.
   * @param {string} userId - Unique ID of requesting user.
   * @returns {Promise<{ session: { id: string }; flashcards: any[]; confidenceMap: Record<string, any> }>} Session details and sorted flashcards.
   */
  static async startSession(kitId: string, userId: string) {
    let kit: import('../models/Kit.js').IKit | import('../utils/inMemoryDb.js').MemKit | null = null;
    if (isMongoConnected()) {
      kit = (await Kit.findOne({ _id: kitId, userId }).lean()) as unknown as import('../models/Kit.js').IKit;
    } else {
      kit = await inMemoryStore.findKitById(kitId, userId);
    }
    if (!kit) throw new AppError('Kit not found', 404, 'KIT_NOT_FOUND');

    let sessionId: string;
    let previousSessions: import('../models/PracticeSession.js').IPracticeSession[] | import('../utils/inMemoryDb.js').MemPracticeSession[] = [];

    if (isMongoConnected()) {
      const session = await PracticeSession.create({
        kitId: kit._id,
        userId,
        results: [],
      });
      sessionId = session._id.toString();
      previousSessions = await PracticeSession.find({
        kitId: kit._id,
        userId,
        completedAt: { $ne: null },
      }).sort({ completedAt: -1 }).limit(5).lean() as unknown as import('../models/PracticeSession.js').IPracticeSession[];
    } else {
      const session = await inMemoryStore.createSession(kitId, userId);
      sessionId = session._id;
      previousSessions = (await inMemoryStore.findSessionsByKit(kitId, userId)).filter(sessionItem => sessionItem.completedAt);
    }

    // Build confidence map from recent sessions
    const confidenceMap = new Map<string, { confidence: number; lastSeen: number }>();
    for (const previousSession of previousSessions) {
      for (const result of previousSession.results) {
        if (!confidenceMap.has(result.flashcardId)) {
          confidenceMap.set(result.flashcardId, {
            confidence: result.confidence,
            lastSeen: new Date(result.answeredAt).getTime(),
          });
        }
      }
    }

    // Pre-decorate flashcards with metrics for O(N) map lookups during sort
    const decoratedFlashcards = (kit.flashcards as Record<string, unknown>[]).map(card => {
      const cardId = card.id as string;
      const entry = confidenceMap.get(cardId);
      return {
        card,
        confidence: entry?.confidence ?? 0,
        lastSeen: entry?.lastSeen ?? 0,
      };
    });

    decoratedFlashcards.sort((itemA, itemB) => {
      if (itemA.confidence !== itemB.confidence) {
        return itemA.confidence - itemB.confidence;
      }
      return itemA.lastSeen - itemB.lastSeen;
    });

    const flashcards = decoratedFlashcards.map(item => item.card);

    return {
      session: { id: sessionId },
      flashcards,
      confidenceMap: Object.fromEntries(confidenceMap),
    };
  }

  /**
   * Records a user's confidence rating (1–5) for a specific flashcard.
   * 
   * @param {string} kitId - Unique kit ID.
   * @param {string} sessionId - Active practice session ID.
   * @param {string} cardId - Flashcard ID.
   * @param {string} userId - User ID.
   * @param {number} confidence - Confidence rating integer (1 to 5).
   * @returns {Promise<any>} Updated session document.
   */
  static async recordConfidence(
    kitId: string,
    sessionId: string,
    cardId: string,
    userId: string,
    confidence: number
  ) {
    if (isMongoConnected()) {
      const session = await PracticeSession.findOne({
        _id: sessionId,
        kitId,
        userId,
      });
      if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');

      const existingIndex = session.results.findIndex(result => result.flashcardId === cardId);
      if (existingIndex >= 0) {
        session.results[existingIndex].confidence = confidence;
        session.results[existingIndex].answeredAt = new Date();
      } else {
        session.results.push({
          flashcardId: cardId,
          confidence,
          answeredAt: new Date(),
        });
      }

      await session.save();
      return session.toObject ? session.toObject() : session;
    } else {
      return inMemoryStore.recordConfidence(sessionId, cardId, confidence);
    }
  }

  /**
   * Completes a practice session.
   * 
   * @param {string} kitId - Unique kit ID.
   * @param {string} sessionId - Active session ID.
   * @param {string} userId - User ID.
   * @returns {Promise<any>} Completed session document.
   */
  static async completeSession(kitId: string, sessionId: string, userId: string) {
    if (isMongoConnected()) {
      const session = await PracticeSession.findOneAndUpdate(
        { _id: sessionId, kitId, userId },
        { $set: { completedAt: new Date() } },
      ).lean() as unknown as import('../models/PracticeSession.js').IPracticeSession;
      if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
      return session;
    } else {
      return inMemoryStore.completeSession(sessionId);
    }
  }

  /**
   * Retrieves overall practice statistics for a kit.
   * 
   * @param {string} kitId - Unique kit ID.
   * @param {string} userId - User ID.
   * @returns {Promise<any>} Flashcard practice statistics & confidence breakdown.
   */
  static async getPracticeStats(kitId: string, userId: string) {
    let kit: import('../models/Kit.js').IKit | import('../utils/inMemoryDb.js').MemKit | null = null;
    let sessions: import('../models/PracticeSession.js').IPracticeSession[] | import('../utils/inMemoryDb.js').MemPracticeSession[] = [];

    if (isMongoConnected()) {
      kit = (await Kit.findOne({ _id: kitId, userId }).lean()) as unknown as import('../models/Kit.js').IKit;
      sessions = (await PracticeSession.find({ kitId, userId, completedAt: { $ne: null } }).lean()) as unknown as import('../models/PracticeSession.js').IPracticeSession[];
    } else {
      kit = await inMemoryStore.findKitById(kitId, userId);
      sessions = (await inMemoryStore.findSessionsByKit(kitId, userId)).filter(sessionItem => sessionItem.completedAt);
    }

    if (!kit) throw new AppError('Kit not found', 404, 'KIT_NOT_FOUND');

    const totalCards = kit.flashcards?.length || 0;
    const latestConfidence = new Map<string, number>();

    for (const sessionItem of sessions) {
      for (const result of sessionItem.results) {
        latestConfidence.set(result.flashcardId, result.confidence);
      }
    }

    const practicedCount = latestConfidence.size;
    const unpracticedCount = Math.max(0, totalCards - practicedCount);

    let sumConfidence = 0;
    latestConfidence.forEach(confidenceRating => { sumConfidence += confidenceRating; });
    const avgConfidence = practicedCount > 0 ? Number((sumConfidence / practicedCount).toFixed(1)) : 0;

    return {
      totalCards,
      practicedCount,
      unpracticedCount,
      avgConfidence,
      sessionsCompleted: sessions.length,
      confidenceBreakdown: Object.fromEntries(latestConfidence),
    };
  }
}
