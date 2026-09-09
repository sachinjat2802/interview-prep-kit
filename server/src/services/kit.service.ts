/**
 * @file kit.service.ts
 * @description Service Layer for Kit Domain — Implements core business logic, database queries, pipeline triggers, and section regeneration.
 * @module Services/KitService
 */

import { Kit, IKit } from '../models/Kit.js';
import { KitStatus } from '../types/domain.js';
import { isMongoConnected, inMemoryStore } from '../utils/inMemoryDb.js';
import { AppError } from '../middleware/errorHandler.js';
import { ErrorCode, ErrorMessage } from '../constants/errorCodes.js';
import { KitStateMachine } from '../core/kitStateMachine.js';
import { runPipeline } from './pipeline/index.js';
import { buildSchedule } from './pipeline/scheduler.js';
import { regenerateQuestionsForCategory, generateCompanyBrief } from './pipeline/generator.js';
import { getGeminiClient } from './llm/gemini.js';
import { researchCompany } from './pipeline/researcher.js';

export class KitService {
  /**
   * Retrieves all prep kits belonging to a specific user.
   * 
   * @param {string} userId - The unique identifier of the authenticated user.
   * @returns {Promise<any[]>} List of user prep kits with overview fields.
   */
  static async getUserKits(userId: string): Promise<(IKit | import('../utils/inMemoryDb.js').MemKit)[]> {
    if (isMongoConnected()) {
      return Kit.find({ userId })
        .select('status source.company source.role daysAvailable createdAt updatedAt generationProgress errorMessage')
        .sort({ createdAt: -1 })
        .lean() as unknown as IKit[];
    } else {
      return inMemoryStore.findKitsByUser(userId);
    }
  }

  /**
   * Retrieves a single kit by its ID, ensuring it belongs to the authenticated user.
   * 
   * @param {string} kitId - Unique ID of the kit.
   * @param {string} userId - Unique ID of the requesting user.
   * @returns {Promise<any>} The matching prep kit document.
   * @throws {AppError} 404 KIT_NOT_FOUND if kit does not exist or belong to user.
   */
  static async getKitById(kitId: string, userId: string): Promise<IKit | import('../utils/inMemoryDb.js').MemKit> {
    let kit: IKit | import('../utils/inMemoryDb.js').MemKit | null = null;
    if (isMongoConnected()) {
      kit = (await Kit.findOne({ _id: kitId, userId }).lean()) as unknown as IKit;
    } else {
      kit = await inMemoryStore.findKitById(kitId, userId);
    }

    if (!kit) {
      throw new AppError(ErrorMessage[ErrorCode.KIT_NOT_FOUND], 404, ErrorCode.KIT_NOT_FOUND);
    }
    return kit;
  }

  /**
   * Initiates async kit generation pipeline for a single role.
   * 
   * @param {string} userId - Unique ID of the creating user.
   * @param {string} jdText - Unformatted job description text.
   * @param {string} companyUrl - Target company website URL.
   * @param {number} daysAvailable - Number of days available before interview.
   * @returns {Promise<any>} Created pending kit object.
   */
  static async createKit(
    userId: string,
    jdText: string,
    companyUrl: string,
    daysAvailable: number
  ): Promise<IKit | import('../utils/inMemoryDb.js').MemKit> {
    // Duplicate detection: check if user already has a ready/generating kit for the same JD + company
    const existingKits = await this.getUserKits(userId);
    const normalizedUrl = companyUrl.toLowerCase().replace(/\/+$/, '');
    const jdHash = jdText.trim().slice(0, 200); // Use first 200 chars as fingerprint
    const targetFingerprint = `${normalizedUrl}::${jdHash}`;

    const duplicate = existingKits.find((k: IKit | import('../utils/inMemoryDb.js').MemKit) => {
      if (k.status !== KitStatus.READY && k.status !== KitStatus.GENERATING) return false;
      const kUrl = (k.companyUrl || k.source?.company_url || '').toLowerCase().replace(/\/+$/, '');
      const kJd = (k.jdText || '').trim().slice(0, 200);
      return `${kUrl}::${kJd}` === targetFingerprint;
    });

    if (duplicate) {
      console.log(`[KitService] Duplicate detected for user ${userId}, returning existing kit ${duplicate._id || (duplicate as { id?: string }).id}`);
      return duplicate;
    }

    let kit: IKit | import('../utils/inMemoryDb.js').MemKit;
    if (isMongoConnected()) {
      kit = await Kit.create({
        userId,
        status: KitStatus.PENDING,
        jdText,
        companyUrl,
        daysAvailable,
        generationProgress: { step: 0, totalSteps: 8, message: 'Queued for generation' },
      });
    } else {
      kit = await inMemoryStore.createKit({
        userId,
        status: KitStatus.PENDING,
        jdText,
        companyUrl,
        daysAvailable,
        generationProgress: { step: 0, totalSteps: 8, message: 'Queued for generation' },
      });
    }

    const kitId = kit._id ? kit._id.toString() : (kit as { id?: string }).id || '';

    // Trigger pipeline asynchronously
    const stateMachine = new KitStateMachine(kitId, KitStatus.PENDING);
    stateMachine.transition(KitStatus.GENERATING);

    runPipeline({ kitId, userId, jdText, companyUrl, daysAvailable })
      .then(async (result) => {
        const kitData = result.kit;
        if (isMongoConnected()) {
          await Kit.findByIdAndUpdate(kitId, {
            ...kitData,
            status: KitStatus.READY,
            generationProgress: { step: 8, totalSteps: 8, message: 'Kit generation complete!' },
          });
        } else {
          await inMemoryStore.updateKit(kitId, {
            ...kitData,
            status: KitStatus.READY,
            generationProgress: { step: 8, totalSteps: 8, message: 'Kit generation complete!' },
          });
        }
        stateMachine.transition(KitStatus.READY);
      })
      .catch((error) => {
        console.error(`[KitService] Pipeline execution failed for kit ${kitId}:`, error);
        if (isMongoConnected()) {
          Kit.findByIdAndUpdate(kitId, {
            status: KitStatus.FAILED,
            errorMessage: (error as Error).message,
          }).catch(() => {});
        } else {
          inMemoryStore.updateKit(kitId, {
            status: KitStatus.FAILED,
            errorMessage: (error as Error).message,
          }).catch(() => {});
        }
        stateMachine.transition(KitStatus.FAILED, (error as Error).message);
      });

    return kit;
  }

  /**
   * Initiates batch creation for multiple description and company pairs.
   * 
   * @param {string} userId - Unique ID of the creating user.
   * @param {Array<{ jd: string; company_url: string; days: number }>} cases - List of batch cases.
   * @returns {Promise<string[]>} Array of created kit IDs.
   */
  static async createBulkKits(
    userId: string,
    cases: Array<{ jd: string; company_url: string; days: number }>
  ): Promise<string[]> {
    const createdIds: string[] = [];

    for (const singleCase of cases) {
      const kit = await this.createKit(userId, singleCase.jd, singleCase.company_url, singleCase.days || 5);
      const kitId = kit._id ? kit._id.toString() : (kit as { id?: string }).id || '';
      createdIds.push(kitId);
    }

    return createdIds;
  }

  /**
   * Updates fields of a prep kit.
   * 
   * @param {string} kitId - Unique kit ID.
   * @param {string} userId - Unique user ID.
   * @param {Record<string, any>} updates - Partial fields to update.
   * @returns {Promise<IKit | import('../utils/inMemoryDb.js').MemKit>} Updated kit document.
   */
  static async updateKit(kitId: string, userId: string, updates: Record<string, unknown>): Promise<IKit | import('../utils/inMemoryDb.js').MemKit> {
    await this.getKitById(kitId, userId);

    if (isMongoConnected()) {
      const updated = await Kit.findOneAndUpdate(
        { _id: kitId, userId },
        { $set: updates as import('mongoose').UpdateQuery<IKit> },
        { new: true }
      ).lean() as unknown as IKit;
      return updated as IKit;
    } else {
      const updated = await inMemoryStore.updateKit(kitId, updates);
      if (!updated) throw new AppError('Kit not found', 404, ErrorCode.KIT_NOT_FOUND);
      return updated;
    }
  }

  /**
   * Deletes a prep kit by ID.
   * 
   * @param {string} kitId - Unique kit ID.
   * @param {string} userId - Unique user ID.
   * @returns {Promise<void>}
   */
  static async deleteKit(kitId: string, userId: string): Promise<void> {
    await this.getKitById(kitId, userId);

    if (isMongoConnected()) {
      await Kit.deleteOne({ _id: kitId, userId });
    } else {
      await inMemoryStore.deleteKit(kitId, userId);
    }
  }

  private static rebuildScheduleHelper(
    questions: unknown[],
    requirements: unknown[],
    daysAvailable: number
  ) {
    const schedQuestions = (questions || []).map(item => {
      const q = item as Record<string, unknown>;
      return {
        id: (q.id as string) || '',
        requirement_ids: Array.isArray(q.requirement_ids) ? (q.requirement_ids as string[]) : [],
        category: (q.category as string) || 'technical',
        difficulty: parseInt(q.difficulty as string) || 2,
      };
    });
    const schedReqs = (requirements || []).map(item => {
      const r = item as Record<string, unknown>;
      return {
        id: (r.id as string) || '',
        priority: (r.priority as 'must' | 'nice') || 'must',
      };
    });
    return buildSchedule(schedQuestions, schedReqs, daysAvailable || 5);
  }

  /**
   * Adds an item (question or flashcard) to a kit.
   */
  static async addItem(kitId: string, userId: string, type: 'question' | 'flashcard', data: Record<string, unknown>): Promise<IKit | import('../utils/inMemoryDb.js').MemKit> {
    const kit = await this.getKitById(kitId, userId);
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem = { ...data, id, _state: 'user_created' };
    
    if (type === 'question') {
      const updatedQuestions = [...(kit.questions || []), newItem];
      const newSchedule = this.rebuildScheduleHelper(updatedQuestions, kit.role?.requirements || [], kit.daysAvailable);
      return this.updateKit(kitId, userId, {
        questions: updatedQuestions,
        schedule: newSchedule as unknown as import('./pipeline/validator.js').KitStructure['schedule'],
      });
    } else {
      const updatedFlashcards = [...(kit.flashcards || []), newItem];
      return this.updateKit(kitId, userId, { flashcards: updatedFlashcards });
    }
  }

  /**
   * Updates an item (question or flashcard) in a kit.
   */
  static async updateItem(kitId: string, userId: string, type: 'question' | 'flashcard', itemId: string, data: Record<string, unknown>): Promise<IKit | import('../utils/inMemoryDb.js').MemKit> {
    const kit = await this.getKitById(kitId, userId);
    
    if (type === 'question') {
      const updatedQuestions = (kit.questions || []).map((q: Record<string, unknown>) => 
        q.id === itemId ? { ...q, ...data, _state: 'edited' } : q
      );
      const newSchedule = this.rebuildScheduleHelper(updatedQuestions, kit.role?.requirements || [], kit.daysAvailable);
      return this.updateKit(kitId, userId, {
        questions: updatedQuestions,
        schedule: newSchedule as unknown as import('./pipeline/validator.js').KitStructure['schedule'],
      });
    } else {
      const updatedFlashcards = (kit.flashcards || []).map((f: Record<string, unknown>) => 
        f.id === itemId ? { ...f, ...data, _state: 'edited' } : f
      );
      return this.updateKit(kitId, userId, { flashcards: updatedFlashcards });
    }
  }

  /**
   * Deletes an item (question or flashcard) from a kit.
   */
  static async deleteItem(kitId: string, userId: string, type: 'question' | 'flashcard', itemId: string): Promise<IKit | import('../utils/inMemoryDb.js').MemKit> {
    const kit = await this.getKitById(kitId, userId);
    
    if (type === 'question') {
      const updatedQuestions = (kit.questions || []).filter((q: Record<string, unknown>) => q.id !== itemId);
      const newSchedule = this.rebuildScheduleHelper(updatedQuestions, kit.role?.requirements || [], kit.daysAvailable);
      return this.updateKit(kitId, userId, {
        questions: updatedQuestions,
        schedule: newSchedule as unknown as import('./pipeline/validator.js').KitStructure['schedule'],
      });
    } else {
      const updatedFlashcards = (kit.flashcards || []).filter((f: Record<string, unknown>) => f.id !== itemId);
      return this.updateKit(kitId, userId, { flashcards: updatedFlashcards });
    }
  }

  /**
   * Regenerates a single section of a prep kit without clobbering user edits or handcrafted items.
   * 
   * @param {string} kitId - Unique kit ID.
   * @param {string} userId - Unique user ID.
   * @param {string} section - Section identifier ('company_brief', 'schedule', 'technical', etc.)
   * @returns {Promise<IKit | import('../utils/inMemoryDb.js').MemKit>} Updated kit document.
   */
  static async regenerateSection(kitId: string, userId: string, section: string, appendCount?: number): Promise<IKit | import('../utils/inMemoryDb.js').MemKit> {
    const kit = await this.getKitById(kitId, userId);
    const llmClient = getGeminiClient();

    if (section === 'company_brief') {
      const research = await researchCompany(kit.companyUrl, kit.source?.company || '');
      const newBrief = await generateCompanyBrief(kit.companyUrl, research.combinedContent, llmClient);
      return this.updateKit(kitId, userId, {
        company_brief: { ...newBrief, sources: research.allSources } as unknown as import('./pipeline/validator.js').KitStructure['company_brief'],
      });
    }

    if (section === 'schedule') {
      const requirements = (kit.role?.requirements || []).map((requirement: Record<string, unknown>) => ({
        id: requirement.id as string,
        priority: requirement.priority as 'must' | 'nice',
      }));
      const questions = (kit.questions || []).map((question: Record<string, unknown>) => ({
        id: question.id as string,
        requirement_ids: question.requirement_ids as string[],
        category: question.category as 'technical' | 'behavioural' | 'system-design' | 'company-fit',
        difficulty: question.difficulty as number,
      }));
      const newSchedule = buildSchedule(questions, requirements, kit.daysAvailable);
      return this.updateKit(kitId, userId, { schedule: newSchedule as unknown as import('../services/pipeline/validator.js').KitStructure['schedule'] });
    }

    // Flashcard regeneration
    if (section === 'flashcards') {
      const currentFlashcards: Record<string, unknown>[] = (kit.flashcards || []) as Record<string, unknown>[];

      // Preserve user-edited and user-created flashcards
      const preserved = currentFlashcards.filter(
        (f: Record<string, unknown>) => f._state === 'edited' || f._state === 'user_created'
      );

      const { generateFlashcards } = await import('./pipeline/generator.js');
      const newFlashcards = await generateFlashcards(
        kit.role?.requirements || [],
        kit.questions || [],
        kit.daysAvailable || 5,
        llmClient,
        kit.role?.title || kit.source?.role || 'Job Position'
      );

      return this.updateKit(kitId, userId, {
        flashcards: [...preserved, ...newFlashcards] as unknown as import('../services/pipeline/validator.js').KitStructure['flashcards'],
      });
    }

    // Category regeneration ('technical', 'behavioural', 'system-design', 'company-fit')
    const validCategories = ['technical', 'behavioural', 'system-design', 'company-fit'];
    if (validCategories.includes(section)) {
      const category = section as 'technical' | 'behavioural' | 'system-design' | 'company-fit';
      const currentQuestions: Record<string, unknown>[] = (kit.questions || []) as Record<string, unknown>[];

      // Preserve user edited and user created questions, OR all questions if we are simply appending
      const preservedQuestions = currentQuestions.filter(
        question => question.category === category && (appendCount !== undefined || question._state === 'edited' || question._state === 'user_created')
      );

      const briefSummary = `${kit.company_brief?.summary || ''} ${kit.company_brief?.what_they_do || ''}`;
      const newGeneratedQuestions = await regenerateQuestionsForCategory(
        category,
        kit.role?.requirements || [],
        briefSummary,
        '',
        preservedQuestions as unknown as import('./pipeline/generator.js').Question[],
        currentQuestions.length + 1,
        llmClient,
        kit.role?.title || kit.source?.role || 'Job Position',
        appendCount
      );

      // Replace generated questions for this category while retaining preserved ones
      const otherCategoryQuestions = currentQuestions.filter(question => question.category !== category);
      const combinedQuestions = [
        ...otherCategoryQuestions,
        ...preservedQuestions,
        ...newGeneratedQuestions,
      ];

      const newSchedule = this.rebuildScheduleHelper(combinedQuestions, kit.role?.requirements || [], kit.daysAvailable);

      return this.updateKit(kitId, userId, {
        questions: combinedQuestions as unknown as import('../services/pipeline/validator.js').KitStructure['questions'],
        schedule: newSchedule as unknown as import('../services/pipeline/validator.js').KitStructure['schedule'],
      });
    }

    throw new AppError(`${ErrorMessage[ErrorCode.INVALID_SECTION]} (${section})`, 400, ErrorCode.INVALID_SECTION);
  }
}
