/**
 * @file errorCodes.ts
 * @description Centralized Error Codes & Messages Registry — Defines all application error code constants and default human-readable messages.
 * @module Constants/ErrorCodes
 */

/**
 * Standardized Application Error Codes.
 */
export enum ErrorCode {
  // Authentication & Authorization Errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  AUTH_FAILED = 'AUTH_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',

  // User Domain Errors
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',

  // Kit Domain Errors
  KIT_NOT_FOUND = 'KIT_NOT_FOUND',
  INVALID_SECTION = 'INVALID_SECTION',
  PIPELINE_FAILED = 'PIPELINE_FAILED',
  COMPANY_UNREACHABLE = 'COMPANY_UNREACHABLE',

  // Practice Domain Errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',

  // General Validation Errors
  INVALID_INPUT = 'INVALID_INPUT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

/**
 * Centralized Mapping of Error Codes to Default Messages.
 */
export const ErrorMessage: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_REQUIRED]: 'Authentication is required to access this resource.',
  [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCode.TOKEN_INVALID]: 'Invalid session token provided.',
  [ErrorCode.AUTH_FAILED]: 'Authentication failed. Please verify credentials.',
  [ErrorCode.UNAUTHORIZED_ACCESS]: 'You are not authorized to access this resource.',

  [ErrorCode.EMAIL_EXISTS]: 'An account with this email address already exists.',
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email address or password.',
  [ErrorCode.USER_NOT_FOUND]: 'User profile not found.',

  [ErrorCode.KIT_NOT_FOUND]: 'Interview preparation kit not found.',
  [ErrorCode.INVALID_SECTION]: 'Invalid section specified for regeneration.',
  [ErrorCode.PIPELINE_FAILED]: 'Kit generation pipeline encountered an error.',
  [ErrorCode.COMPANY_UNREACHABLE]: 'Target company website could not be reached.',

  [ErrorCode.SESSION_NOT_FOUND]: 'Practice session not found.',

  [ErrorCode.INVALID_INPUT]: 'Provided input parameters are invalid.',
  [ErrorCode.VALIDATION_ERROR]: 'Validation error on input data.',
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'An unexpected server error occurred.',
};
