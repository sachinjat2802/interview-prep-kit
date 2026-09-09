/**
 * @file api.ts
 * @description Frontend API Client
 * @module Client/Services/ApiClient
 */
import { User, Kit, Flashcard } from './types';

function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    // In local Next.js dev mode (port 3000), target Express backend on port 3001
    if (window.location.port === '3000') {
      return 'http://localhost:3001/api';
    }
    // In production (same-origin deployment), target current origin /api
    return `${window.location.origin}/api`;
  }
  return '/api';
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = getApiUrl();
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      return response.json() as Promise<T>;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'TypeError' && (error.message?.includes('fetch') || error.message?.includes('NetworkError'))) {
        throw new Error(`Unable to connect to backend API server at ${baseUrl}. Please make sure the backend server is running.`);
      }
      throw error;
    }
  }

  // Auth
  async register(email: string, password: string, name: string) {
    const data = await this.request<{ user: User; token: string }>('POST', '/auth/register', { email, password, name });
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{ user: User; token: string }>('POST', '/auth/login', { email, password });
    this.setToken(data.token);
    return data;
  }

  async logout() {
    await this.request('POST', '/auth/logout');
    this.setToken(null);
  }

  async getMe() {
    try {
      return await this.request<{ user: User }>('GET', '/auth/me');
    } catch {
      this.setToken(null);
      return { user: null };
    }
  }

  // Kits
  async getKits() {
    return this.request<{ kits: Kit[] }>('GET', '/kits');
  }

  async getKit(id: string) {
    try {
      return await this.request<{ kit: Kit }>('GET', `/kits/${id}`);
    } catch {
      return { kit: null };
    }
  }

  async createKit(jdText: string, companyUrl: string, daysAvailable: number) {
    return this.request<{ kit: Kit }>('POST', '/kits', { jdText, companyUrl, daysAvailable });
  }

  async createBulkKits(cases: Array<{ jd: string; company_url: string; days: number }>) {
    return this.request<{ kitIds: string[] }>('POST', '/kits/bulk', { cases });
  }

  async updateKit(id: string, updates: Partial<Kit>) {
    return this.request<{ kit: Kit }>('PUT', `/kits/${id}`, updates);
  }

  async updateItem(kitId: string, itemId: string, type: string, data: Record<string, unknown>) {
    return this.request<{ kit: Kit }>('PUT', `/kits/${kitId}/items/${itemId}`, { type, data });
  }

  async addItem(kitId: string, type: string, data: Record<string, unknown>) {
    return this.request<{ kit: Kit }>('POST', `/kits/${kitId}/items`, { type, data });
  }

  async deleteItem(kitId: string, itemId: string, type: string) {
    return this.request<{ kit: Kit }>('DELETE', `/kits/${kitId}/items/${itemId}?type=${type}`);
  }

  async regenerateSection(kitId: string, section: string, appendCount?: number) {
    const url = appendCount ? `/kits/${kitId}/regenerate/${section}?appendCount=${appendCount}` : `/kits/${kitId}/regenerate/${section}`;
    return this.request<{ kit: Kit }>('POST', url);
  }

  // Study Deep Dive Endpoints
  async generateMindmap(kitId: string, questionId: string) {
    return this.request<{ result: string }>('POST', `/kits/${kitId}/questions/${questionId}/study`, { action: 'mindmap' });
  }

  async explainTechnique(kitId: string, questionId: string, technique: string) {
    return this.request<{ result: string }>('POST', `/kits/${kitId}/questions/${questionId}/study`, { action: 'technique', data: { technique } });
  }

  async chatStudy(kitId: string, questionId: string, message: string, history: Array<{ role: string; content: string }>) {
    return this.request<{ result: string }>('POST', `/kits/${kitId}/questions/${questionId}/study`, { action: 'chat', data: { message, history } });
  }

  async deleteKit(id: string) {
    return this.request<{ message: string }>('DELETE', `/kits/${id}`);
  }

  // SSE for progress
  subscribeToProgress(kitId: string, onMessage: (data: { step: number; totalSteps: number; message: string; status?: string; }) => void): () => void {
    const token = this.getToken();
    const url = `${getApiUrl()}/kits/${kitId}/progress`;
    
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                onMessage(data);
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('SSE error:', error);
        }
      }
    })();

    return () => controller.abort();
  }

  // Practice
  async startPracticeSession(kitId: string) {
    return this.request<{ session: { id: string }; flashcards: Flashcard[]; confidenceMap: Record<string, { confidence: number; lastSeen: number }> }>(
      'POST', `/practice/${kitId}/session`
    );
  }

  async recordConfidence(kitId: string, sessionId: string, cardId: string, confidence: number) {
    return this.request('PUT', `/practice/${kitId}/session/${sessionId}/card/${cardId}`, { confidence });
  }

  async completePracticeSession(kitId: string, sessionId: string) {
    return this.request<{ session: { id: string, completedAt: string } }>('PUT', `/practice/${kitId}/session/${sessionId}/complete`);
  }

  async getPracticeStats(kitId: string) {
    return this.request<{
      totalCards: number;
      practicedCount: number;
      unpracticedCount: number;
      avgConfidence: number;
      sessionsCompleted: number;
      confidenceBreakdown: Record<string, number>;
    }>('GET', `/practice/${kitId}/stats`);
  }
}

export const api = new ApiClient();
