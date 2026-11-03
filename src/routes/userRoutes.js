import { Router } from 'express';
import { listUsers, createUser, toggleUserStatus, deleteUser } from '../controllers/userController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN']), listUsers);
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN']), createUser);
router.patch('/:id/status', requireRole(['SUPER_ADMIN']), toggleUserStatus);
router.delete('/:id', requireRole(['SUPER_ADMIN']), deleteUser);

export default router;
