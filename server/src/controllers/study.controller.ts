import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { ErrorCode, ErrorMessage } from '../constants/errorCodes.js';
import { KitService } from '../services/kit.service.js';
import { StudyService } from '../services/study.service.js';
import { getGeminiClient } from '../services/llm/gemini.js';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export class StudyController {
  static async handleStudyAction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const kitId = getParam(req.params.id);
      const questionId = getParam(req.params.questionId);
      const { action, data } = req.body;

      if (!action) {
        throw new AppError('Action is required', 400, ErrorCode.VALIDATION_ERROR);
      }

      // 1. Fetch kit to ensure ownership and get the specific question
      const kit = await KitService.getKitById(kitId, req.userId!);
      const questions = (kit.questions || []) as Record<string, any>[];
      const question = questions.find(q => q.id === questionId);

      if (!question) {
        throw new AppError('Question not found in kit', 404, ErrorCode.KIT_NOT_FOUND);
      }

      const prompt = typeof question.prompt === 'string' ? question.prompt : '';
      const outline = typeof question.answer_outline === 'string' ? question.answer_outline : '';
      const llmClient = getGeminiClient();
      let result = '';

      // 2. Route action
      switch (action) {
        case 'mindmap':
          result = await StudyService.generateMindmap(prompt, outline, llmClient);
          break;
        case 'technique':
          const technique = data?.technique || 'Feynman Technique';
          result = await StudyService.explainWithTechnique(prompt, outline, technique, llmClient);
          break;
        case 'chat':
          const message = data?.message;
          const history = data?.history || [];
          if (!message) {
            throw new AppError('Message is required for chat', 400, ErrorCode.VALIDATION_ERROR);
          }
          result = await StudyService.chatWithQuestion(prompt, outline, message, history, llmClient);
          break;
        default:
          throw new AppError(`Unknown study action: ${action}`, 400, ErrorCode.VALIDATION_ERROR);
        }

      res.json({ success: true, result });
    } catch (error) {
      next(error);
    }
  }
}
