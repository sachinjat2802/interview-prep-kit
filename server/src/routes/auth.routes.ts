/**
 * @file auth.routes.ts
 * @description Routing Layer for Auth Endpoints — Delegates authentication HTTP requests to AuthController.
 * @module Routes/AuthRoutes
 */

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public authentication endpoints
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);

// Protected session endpoint
router.get('/me', authenticate, AuthController.getMe);

export default router;
