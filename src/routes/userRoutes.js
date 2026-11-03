import { Router } from 'express';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
} from '../controllers/userController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN']), listUsers);
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN']), createUser);
router.get('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), getUserById);
router.put('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), updateUser);
router.patch('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), updateUser);
router.patch('/:id/status', requireRole(['SUPER_ADMIN']), toggleUserStatus);
router.delete('/:id', requireRole(['SUPER_ADMIN']), deleteUser);

export default router;
