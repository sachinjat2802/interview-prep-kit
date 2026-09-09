/**
 * @file auth.service.ts
 * @description Service Layer for User Authentication Domain — Manages registration, authentication, JWT tokens, and user profile retrieval.
 * @module Services/AuthService
 */

import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';
import { isMongoConnected, inMemoryStore } from '../utils/inMemoryDb.js';

export class AuthService {
  /**
   * Generates a signed JWT authentication token for a user ID.
   * 
   * @param {string} userId - Unique identifier of the authenticated user.
   * @returns {string} Signed JWT token string.
   */
  static generateToken(userId: string): string {
    return jwt.sign({ userId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Registers a new user account.
   * 
   * @param {string} email - User email address.
   * @param {string} password - User password (min 6 characters).
   * @param {string} name - User display name.
   * @returns {Promise<{ user: { id: string; email: string; name: string }; token: string }>} User profile & token.
   * @throws {AppError} 409 EMAIL_EXISTS if email is already registered.
   */
  static async register(email: string, password: string, name: string) {
    const normalizedEmail = email.toLowerCase().trim();

    let userId: string;
    let userEmail: string;
    let userName: string;

    if (isMongoConnected()) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
      }
      const user = await User.create({ email: normalizedEmail, password, name: name.trim() });
      userId = user._id.toString();
      userEmail = user.email;
      userName = user.name;
    } else {
      const existing = await inMemoryStore.findUserByEmail(normalizedEmail);
      if (existing) {
        throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
      }
      const user = await inMemoryStore.createUser(normalizedEmail, password, name.trim());
      userId = user._id;
      userEmail = user.email;
      userName = user.name;
    }

    const token = this.generateToken(userId);
    return { user: { id: userId, email: userEmail, name: userName }, token };
  }

  /**
   * Authenticates user credentials and generates a session token.
   * 
   * @param {string} email - Registered user email address.
   * @param {string} password - User password.
   * @returns {Promise<{ user: { id: string; email: string; name: string }; token: string }>} User profile & token.
   * @throws {AppError} 401 INVALID_CREDENTIALS if authentication fails.
   */
  static async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();

    let userId: string;
    let userEmail: string;
    let userName: string;

    if (isMongoConnected()) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }
      userId = user._id.toString();
      userEmail = user.email;
      userName = user.name;
    } else {
      const user = await inMemoryStore.findUserByEmail(normalizedEmail);
      if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }
      const isMatch = await inMemoryStore.comparePassword(password, user.passwordHash);
      if (!isMatch) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }
      userId = user._id;
      userEmail = user.email;
      userName = user.name;
    }

    const token = this.generateToken(userId);
    return { user: { id: userId, email: userEmail, name: userName }, token };
  }

  /**
   * Retrieves profile details for an authenticated user ID.
   * 
   * @param {string} userId - User ID.
   * @returns {Promise<{ id: string; email: string; name: string }>} User profile.
   * @throws {AppError} 404 USER_NOT_FOUND if user record is missing.
   */
  static async getUserProfile(userId: string) {
    if (isMongoConnected()) {
      const user = await User.findById(userId).select('-password').lean();
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      return { id: user._id.toString(), email: user.email, name: user.name };
    } else {
      const user = await inMemoryStore.findUserById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      return { id: user._id, email: user.email, name: user.name };
    }
  }
}
