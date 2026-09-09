import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

import { KitStructure } from '../services/pipeline/validator.js';
import { KitStatus } from '../types/domain.js';

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// ─── In-memory Data Stores ───

export interface MemUser {
  _id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

export interface MemKit {
  _id: string;
  id?: string;
  userId: string;
  status: KitStatus;
  generationProgress: { step: number; totalSteps: number; message: string };
  errorMessage?: string;
  jdText: string;
  companyUrl: string;
  daysAvailable: number;
  source: KitStructure['source'];
  company_brief: KitStructure['company_brief'];
  role: KitStructure['role'];
  questions: KitStructure['questions'];
  flashcards: KitStructure['flashcards'];
  schedule: KitStructure['schedule'];
  coverage: KitStructure['coverage'];
  createdAt: string;
  updatedAt: string;
}

export interface MemPracticeSession {
  _id: string;
  kitId: string;
  userId: string;
  results: Array<{ flashcardId: string; confidence: number; answeredAt: Date }>;
  completedAt?: Date | null;
  createdAt: string;
}

class InMemoryStore {
  private users = new Map<string, MemUser>();
  private userEmailsIndex = new Map<string, string>();
  private kits = new Map<string, MemKit>();
  private sessions = new Map<string, MemPracticeSession>();
  private idCounter = 1000;
  private dataFilePath = path.resolve(process.cwd(), 'in-memory-db.json');

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data.users) {
          this.users = new Map(Object.entries(data.users));
          this.userEmailsIndex.clear();
          for (const user of this.users.values()) {
            if (user.email) {
              this.userEmailsIndex.set(user.email.toLowerCase(), user._id);
            }
          }
        }
        if (data.kits) {
          this.kits = new Map(Object.entries(data.kits));
          this.userKitsIndex.clear();
          for (const kit of this.kits.values()) {
            if (kit.userId) {
              if (!this.userKitsIndex.has(kit.userId)) this.userKitsIndex.set(kit.userId, new Set());
              this.userKitsIndex.get(kit.userId)!.add(kit._id);
            }
          }
        }
        if (data.sessions) this.sessions = new Map(Object.entries(data.sessions));
        if (data.idCounter) this.idCounter = data.idCounter;
      }
    } catch (e) {
      console.error('Failed to load in-memory DB:', e);
    }
  }

  private saveTimer: NodeJS.Timeout | null = null;

  private save() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try {
        const data = {
          users: Object.fromEntries(this.users),
          kits: Object.fromEntries(this.kits),
          sessions: Object.fromEntries(this.sessions),
          idCounter: this.idCounter,
        };
        fs.promises.writeFile(this.dataFilePath, JSON.stringify(data, null, 2), 'utf-8').catch(e => {
          console.error('Failed to save in-memory DB asynchronously:', e);
        });
      } catch (e) {
        console.error('Failed to save in-memory DB:', e);
      }
    }, 50);
  }

  private generateId(prefix: string): string {
    this.idCounter++;
    this.save();
    return `${prefix}_${Date.now()}_${this.idCounter}`;
  }

  // ─── User Operations ───

  async findUserByEmail(email: string): Promise<MemUser | null> {
    const userId = this.userEmailsIndex.get(email.toLowerCase());
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  async findUserById(id: string): Promise<MemUser | null> {
    return this.users.get(id) || null;
  }

  async createUser(email: string, passwordRaw: string, name: string): Promise<MemUser> {
    const _id = this.generateId('usr');
    const passwordHash = await bcrypt.hash(passwordRaw, 12);
    const user: MemUser = {
      _id,
      email: email.toLowerCase(),
      passwordHash,
      name,
      createdAt: new Date().toISOString(),
    };
    this.users.set(_id, user);
    this.userEmailsIndex.set(user.email, _id);
    this.save();
    return user;
  }

  async verifyPassword(user: MemUser, candidate: string): Promise<boolean> {
    return bcrypt.compare(candidate, user.passwordHash);
  }

  async comparePassword(candidate: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(candidate, passwordHash);
  }

  private userKitsIndex = new Map<string, Set<string>>();

  // ─── Kit Operations ───

  async findKitsByUser(userId: string): Promise<MemKit[]> {
    const kitIds = this.userKitsIndex.get(userId);
    if (!kitIds || kitIds.size === 0) return [];

    const list: MemKit[] = [];
    for (const id of kitIds) {
      const kit = this.kits.get(id);
      if (kit) list.push(kit);
    }
    return list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0));
  }

  async findKitById(id: string, userId?: string): Promise<MemKit | null> {
    const kit = this.kits.get(id);
    if (!kit) return null;
    if (userId && kit.userId !== userId) return null;
    return kit;
  }

  async createKit(input: {
    userId: string;
    jdText: string;
    companyUrl: string;
    daysAvailable: number;
    status?: KitStatus;
    generationProgress?: { step: number; totalSteps: number; message: string };
  }): Promise<MemKit> {
    const _id = this.generateId('kit');
    const now = new Date().toISOString();
    const kit: MemKit = {
      _id,
      userId: input.userId,
      status: (input.status as KitStatus) || KitStatus.GENERATING,
      generationProgress: input.generationProgress || { step: 0, totalSteps: 8, message: 'Starting...' },
      jdText: input.jdText,
      companyUrl: input.companyUrl,
      daysAvailable: input.daysAvailable,
      source: { company: '', company_url: input.companyUrl, role: '', location: '', jd_chars: input.jdText.length, researched_at: '', pages_used: [] },
      company_brief: { summary: '', what_they_do: '', sources: [] },
      role: { title: '', seniority: '', responsibilities: [], requirements: [] },
      questions: [],
      flashcards: [],
      schedule: { days_available: input.daysAvailable, days: [] },
      coverage: { uncovered_requirement_ids: [], passes: 0 },
      createdAt: now,
      updatedAt: now,
    };
    this.kits.set(_id, kit);
    if (!this.userKitsIndex.has(input.userId)) {
      this.userKitsIndex.set(input.userId, new Set());
    }
    this.userKitsIndex.get(input.userId)!.add(_id);
    this.save();
    return kit;
  }

  async updateKit(id: string, updates: Partial<MemKit>): Promise<MemKit | null> {
    const existing = this.kits.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.kits.set(id, updated);
    this.save();
    return updated;
  }

  async deleteKit(id: string, userId: string): Promise<boolean> {
    const existing = this.kits.get(id);
    if (!existing || existing.userId !== userId) return false;
    const deleted = this.kits.delete(id);
    if (deleted) {
      this.userKitsIndex.get(userId)?.delete(id);
      this.save();
    }
    return deleted;
  }

  // ─── Practice Session Operations ───

  async createSession(kitId: string, userId: string): Promise<MemPracticeSession> {
    const _id = this.generateId('sess');
    const sess: MemPracticeSession = {
      _id,
      kitId,
      userId,
      results: [],
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(_id, sess);
    this.save();
    return sess;
  }

  async findSessionById(id: string, kitId?: string, userId?: string): Promise<MemPracticeSession | null> {
    const sess = this.sessions.get(id);
    if (!sess) return null;
    if (kitId && sess.kitId !== kitId) return null;
    if (userId && sess.userId !== userId) return null;
    return sess;
  }

  async findSessionsByKit(kitId: string, userId: string): Promise<MemPracticeSession[]> {
    const list: MemPracticeSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.kitId === kitId && session.userId === userId) {
        list.push(session);
      }
    }
    return list;
  }

  async updateSession(sess: MemPracticeSession): Promise<void> {
    this.sessions.set(sess._id, sess);
    this.save();
  }

  async recordConfidence(sessionId: string, cardId: string, confidence: number): Promise<MemPracticeSession | null> {
    const sess = this.sessions.get(sessionId);
    if (!sess) return null;
    const index = sess.results.findIndex(result => result.flashcardId === cardId);
    if (index >= 0) {
      sess.results[index].confidence = confidence;
      sess.results[index].answeredAt = new Date();
    } else {
      sess.results.push({ flashcardId: cardId, confidence, answeredAt: new Date() });
    }
    this.sessions.set(sessionId, sess);
    this.save();
    return sess;
  }

  async completeSession(sessionId: string): Promise<MemPracticeSession | null> {
    const sess = this.sessions.get(sessionId);
    if (!sess) return null;
    sess.completedAt = new Date();
    this.sessions.set(sessionId, sess);
    this.save();
    return sess;
  }
}

export const inMemoryStore = new InMemoryStore();
