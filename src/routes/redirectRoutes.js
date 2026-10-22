import { Router } from 'express';
import { handleRedirect, handleActivationRequest } from '../controllers/redirectController.js';
import { redirectLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public redirect endpoint: GET /q/:publicCode
router.get('/:publicCode', redirectLimiter, handleRedirect);

// Public activation request endpoint: POST /q/:publicCode/request
router.post('/:publicCode/request', redirectLimiter, handleActivationRequest);

export default router;
