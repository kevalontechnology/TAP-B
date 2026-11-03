import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { createUserSchema, updateUserSchema } from '../validators/authValidator.js';
import { cascadeDeleteUser } from './authController.js';

export async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const validated = updateUserSchema.parse(req.body);

    // Email uniqueness check if email is modified
    if (validated.email && validated.email.toLowerCase() !== user.email.toLowerCase()) {
      const existingEmail = await User.findOne({
        email: validated.email.toLowerCase(),
        _id: { $ne: id },
      });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: 'A user with this email already exists',
        });
      }
      user.email = validated.email.toLowerCase();
    }

    // Username uniqueness check if modified
    if (validated.username !== undefined) {
      const trimmedUsername = validated.username ? validated.username.toLowerCase().trim() : null;
      if (trimmedUsername && trimmedUsername !== user.username) {
        const existingUsername = await User.findOne({
          username: trimmedUsername,
          _id: { $ne: id },
        });
        if (existingUsername) {
          return res.status(409).json({
            success: false,
            error: 'This username is already taken',
          });
        }
      }
      user.username = trimmedUsername || undefined;
    }

    if (validated.name !== undefined) user.name = validated.name;
    if (validated.phone !== undefined) user.phone = validated.phone;
    if (validated.avatarUrl !== undefined) user.avatarUrl = validated.avatarUrl;
    if (validated.role !== undefined) user.role = validated.role;
    if (validated.isActive !== undefined) user.isActive = validated.isActive;

    if (validated.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(validated.password, salt);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const validated = createUserSchema.parse(req.body);

    const existing = await User.findOne({ email: validated.email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A user with this email already exists',
      });
    }

    let username = validated.username ? validated.username.toLowerCase().trim() : null;
    if (username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          error: 'This username is already taken',
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    const user = await User.create({
      name: validated.name,
      username: username || undefined,
      email: validated.email.toLowerCase(),
      passwordHash,
      role: validated.role,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Prevent deactivating own account
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account',
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account from user management',
      });
    }

    await cascadeDeleteUser(id);

    return res.status(200).json({
      success: true,
      message: `User "${targetUser.name}" and all associated digital profiles have been permanently deleted.`,
    });
  } catch (err) {
    next(err);
  }
}
