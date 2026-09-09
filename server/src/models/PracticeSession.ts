import mongoose, { Schema, Document } from 'mongoose';

export interface ICardResult {
  flashcardId: string;
  confidence: number; // 1 = unsure, 2 = ok, 3 = confident
  answeredAt: Date;
}

export interface IPracticeSession extends Document {
  kitId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  results: ICardResult[];
  startedAt: Date;
  completedAt: Date | null;
}

const cardResultSchema = new Schema({
  flashcardId: { type: String, required: true },
  confidence: { type: Number, min: 1, max: 3, required: true },
  answeredAt: { type: Date, default: Date.now },
}, { _id: false });

const practiceSessionSchema = new Schema({
  kitId: { type: Schema.Types.ObjectId, ref: 'Kit', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  results: [cardResultSchema],
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

export const PracticeSession = mongoose.model<IPracticeSession>('PracticeSession', practiceSessionSchema);
