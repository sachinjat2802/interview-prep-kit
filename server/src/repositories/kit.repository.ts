/**
 * Repository Pattern — Abstracts data access behind a clean interface.
 * 
 * Benefits:
 * - Decouples business logic from Mongoose
 * - Makes services testable with mock repositories
 * - Centralizes query logic
 * - Follows the Single Responsibility Principle
 */

import { Kit, IKit } from '../models/Kit.js';
import mongoose from 'mongoose';
import { KitStatus } from '../types/domain.js';
import { KitStructure } from '../services/pipeline/validator.js';

export interface KitCreateInput {
  userId: string;
  jdText: string;
  companyUrl: string;
  daysAvailable: number;
}

export interface KitUpdateInput {
  status?: KitStatus;
  errorMessage?: string;
  generationProgress?: { step: number; totalSteps: number; message: string };
  source?: Partial<KitStructure['source']>;
  company_brief?: Partial<KitStructure['company_brief']>;
  role?: Partial<KitStructure['role']>;
  questions?: KitStructure['questions'];
  flashcards?: KitStructure['flashcards'];
  schedule?: Partial<KitStructure['schedule']>;
  coverage?: Partial<KitStructure['coverage']>;
}

export interface IKitRepository {
  create(input: KitCreateInput): Promise<IKit>;
  findById(id: string, userId: string): Promise<IKit | null>;
  findByUser(userId: string): Promise<IKit[]>;
  update(id: string, updates: KitUpdateInput): Promise<IKit | null>;
  updateProgress(id: string, step: number, totalSteps: number, message: string): Promise<void>;
  delete(id: string, userId: string): Promise<boolean>;
}

/**
 * Mongoose implementation of the Kit repository.
 */
export class MongoKitRepository implements IKitRepository {
  async create(input: KitCreateInput): Promise<IKit> {
    return Kit.create({
      userId: new mongoose.Types.ObjectId(input.userId),
      jdText: input.jdText,
      companyUrl: input.companyUrl,
      daysAvailable: input.daysAvailable,
      status: KitStatus.GENERATING,
      generationProgress: { step: 0, totalSteps: 10, message: 'Starting...' },
    });
  }

  async findById(id: string, userId: string): Promise<IKit | null> {
    return Kit.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  async findByUser(userId: string): Promise<IKit[]> {
    return Kit.find({ userId: new mongoose.Types.ObjectId(userId) })
      .select('status source.company source.role daysAvailable createdAt updatedAt generationProgress errorMessage')
      .sort({ createdAt: -1 });
  }

  async update(id: string, updates: KitUpdateInput): Promise<IKit | null> {
    return Kit.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );
  }

  async updateProgress(id: string, step: number, totalSteps: number, message: string): Promise<void> {
    await Kit.updateOne(
      { _id: id },
      { $set: { generationProgress: { step, totalSteps, message } } }
    );
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await Kit.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    });
    return result.deletedCount > 0;
  }
}
