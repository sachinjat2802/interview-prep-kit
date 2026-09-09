import mongoose, { Schema, Document } from 'mongoose';
import { KitStatus } from '../types/domain.js';
import { KitStructure } from '../services/pipeline/validator.js';

// ─── Kit Sub-schemas (matching Appendix A exactly) ───

const sourceSchema = new Schema({
  company: { type: String, default: '' },
  company_url: { type: String, default: '' },
  role: { type: String, default: '' },
  location: { type: String, default: '' },
  jd_chars: { type: Number, default: 0 },
  researched_at: { type: String, default: '' },
  pages_used: [{ type: String }],
}, { _id: false });

const companyBriefSchema = new Schema({
  summary: { type: String, default: '' },
  what_they_do: { type: String, default: '' },
  sources: [{ type: String }],
}, { _id: false });

const requirementSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  kind: { type: String, enum: ['technical', 'behavioural', 'domain'], required: true },
  priority: { type: String, enum: ['must', 'nice'], required: true },
}, { _id: false });

const roleSchema = new Schema({
  title: { type: String, default: '' },
  seniority: { type: String, default: '' },
  responsibilities: [{ type: String }],
  requirements: [requirementSchema],
}, { _id: false });

const questionSchema = new Schema({
  id: { type: String, required: true },
  requirement_ids: [{ type: String }],
  category: { type: String, enum: ['technical', 'behavioural', 'system-design', 'company-fit'], required: true },
  prompt: { type: String, default: '' },
  answer_outline: { type: String, default: '' },
  difficulty: { type: Number, min: 1, max: 3, default: 2 },
  _state: { type: String, enum: ['generated', 'edited', 'user_created'], default: 'generated' },
}, { _id: false });

const flashcardSchema = new Schema({
  id: { type: String, required: true },
  front: { type: String, default: '' },
  back: { type: String, default: '' },
  requirement_ids: [{ type: String }],
  _state: { type: String, enum: ['generated', 'edited', 'user_created'], default: 'generated' },
}, { _id: false });

const scheduleDaySchema = new Schema({
  day: { type: Number, required: true },
  focus: { type: String, default: '' },
  question_ids: [{ type: String }],
  minutes: { type: Number, default: 60 },
}, { _id: false });

const scheduleSchema = new Schema({
  days_available: { type: Number, required: true },
  days: [scheduleDaySchema],
}, { _id: false });

const coverageSchema = new Schema({
  uncovered_requirement_ids: [{ type: String }],
  passes: { type: Number, default: 0 },
}, { _id: false });

// ─── Main Kit Document ───

export interface IKit extends Document {
  userId: mongoose.Types.ObjectId;
  status: KitStatus;
  generationProgress: {
    step: number;
    totalSteps: number;
    message: string;
  };
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
  createdAt: Date;
  updatedAt: Date;
}

const kitSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: {
    type: String,
    enum: Object.values(KitStatus),
    default: KitStatus.PENDING,
  },
  generationProgress: {
    step: { type: Number, default: 0 },
    totalSteps: { type: Number, default: 10 },
    message: { type: String, default: '' },
  },
  errorMessage: { type: String, default: null },
  jdText: { type: String, required: true },
  companyUrl: { type: String, required: true },
  daysAvailable: { type: Number, required: true, min: 1, max: 365 },
  
  // Kit structure (Appendix A)
  source: { type: sourceSchema, default: () => ({}) },
  company_brief: { type: companyBriefSchema, default: () => ({}) },
  role: { type: roleSchema, default: () => ({}) },
  questions: [questionSchema],
  flashcards: [flashcardSchema],
  schedule: { type: scheduleSchema, default: () => ({ days_available: 1, days: [] }) },
  coverage: { type: coverageSchema, default: () => ({ uncovered_requirement_ids: [], passes: 0 }) },
}, {
  timestamps: true,
});

export const Kit = mongoose.model<IKit>('Kit', kitSchema);
