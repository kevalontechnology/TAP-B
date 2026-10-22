import { Router } from 'express';
import { listUsers, createUser, toggleUserStatus } from '../controllers/userController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN']), listUsers);
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN']), createUser);
router.patch('/:id/status', requireRole(['SUPER_ADMIN']), toggleUserStatus);

export default router;
