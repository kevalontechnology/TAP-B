import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { DigitalProfile } from '../models/DigitalProfile.js';
import { PhoneOtp } from '../models/PhoneOtp.js';
import { config } from '../config/env.js';
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/authValidator.js';

/**
 * Generate JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export async function login(req, res, next) {
  try {
    const validated = loginSchema.parse(req.body);
    const user = await User.findOne({ email: validated.email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact administrator.',
      });
    }

    const isMatch = await user.comparePassword(validated.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function register(req, res, next) {
  try {
    const validated = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: validated.email.toLowerCase() });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    const user = await User.create({
      name: validated.name,
      email: validated.email.toLowerCase(),
      passwordHash,
      phone: validated.phone || '',
      role: 'CUSTOMER',
      isActive: true,
      lastLogin: new Date(),
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}

export async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || '',
      avatarUrl: req.user.avatarUrl || '',
      role: req.user.role,
      lastLogin: req.user.lastLogin,
      createdAt: req.user.createdAt,
    },
  });
}

export async function updateProfile(req, res, next) {
  try {
    const validated = updateProfileSchema.parse(req.body);
    if (validated.name !== undefined) req.user.name = validated.name;
    if (validated.phone !== undefined) req.user.phone = validated.phone;
    if (validated.avatarUrl !== undefined) req.user.avatarUrl = validated.avatarUrl;
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || '',
        avatarUrl: req.user.avatarUrl || '',
        role: req.user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const validated = changePasswordSchema.parse(req.body);

    const isMatch = await req.user.comparePassword(validated.currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password does not match',
      });
    }

    const salt = await bcrypt.genSalt(10);
    req.user.passwordHash = await bcrypt.hash(validated.newPassword, salt);
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const validated = forgotPasswordSchema.parse(req.body);
    const user = await User.findOne({ email: validated.email.toLowerCase() });

    if (!user) {
      // Don't disclose if email exists for privacy/security
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset instruction has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset token generated. In production, this is sent via email.',
      resetToken, // Provided for developer/testing convenience
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const validated = resetPasswordSchema.parse(req.body);
    const user = await User.findOne({
      resetPasswordToken: validated.token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Password reset token is invalid or has expired',
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(validated.newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const userId = req.user._id;
    // Deactivate user account
    req.user.isActive = false;
    await req.user.save();

    // Deactivate all associated profiles
    await DigitalProfile.updateMany({ userId }, { isActive: false, isPublic: false });

    return res.status(200).json({
      success: true,
      message: 'Account and associated profiles have been deactivated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Helper to normalize phone number to standard 10 digits
 */
function normalizePhone(rawPhone = '') {
  let cleaned = String(rawPhone || '').replace(/[^0-9]/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

/**
 * POST /api/auth/send-otp
 * Generates and sends OTP to user's mobile number
 */
export async function sendPhoneOtp(req, res, next) {
  try {
    const { phone } = req.body;
    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 10-digit mobile number',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Upsert PhoneOtp
    await PhoneOtp.findOneAndUpdate(
      { phone: cleanPhone },
      { phone: cleanPhone, otp, expiresAt, attempts: 0 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // In production, integrate with SMS gateway (Twilio / Fast2SMS / MSG91)
    console.log(`[SMS Gateway] Sent OTP ${otp} to mobile +91 ${cleanPhone}`);

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to +91 ${cleanPhone}`,
      phone: cleanPhone,
      demoOtp: config.env !== 'production' ? otp : undefined,
      expiresInSeconds: 300,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 * Verifies mobile OTP and logs in / signs up the user
 */
export async function verifyPhoneOtp(req, res, next) {
  try {
    const { phone, otp } = req.body;
    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        error: 'Valid 10-digit mobile number is required',
      });
    }

    if (!otp || String(otp).trim().length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 6-digit OTP',
      });
    }

    const trimmedOtp = String(otp).trim();

    // Verify OTP against database or development fallback (123456)
    const storedOtp = await PhoneOtp.findOne({ phone: cleanPhone });
    const isDevFallback = config.env !== 'production' && trimmedOtp === '123456';
    const isMatch = storedOtp && storedOtp.otp === trimmedOtp && storedOtp.expiresAt > new Date();

    if (!isMatch && !isDevFallback) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP. Please request a new OTP.',
      });
    }

    // Clear OTP after successful verification
    if (storedOtp) {
      await PhoneOtp.deleteOne({ _id: storedOtp._id });
    }

    // Find user by phone, or email fallback
    let user = await User.findOne({
      $or: [{ phone: cleanPhone }, { email: `${cleanPhone}@kevalonone.com` }, { email: `${cleanPhone}@tapzy.in` }],
    });

    if (!user) {
      // Auto-register new customer user
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      user = await User.create({
        name: `User ${cleanPhone.slice(-4)}`,
        email: `${cleanPhone}@kevalonone.com`,
        phone: cleanPhone,
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
        lastLogin: new Date(),
      });
    } else {
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Your account has been deactivated. Please contact administrator.',
        });
      }
      user.lastLogin = new Date();
      if (!user.phone) {
        user.phone = cleanPhone;
      }
      await user.save();
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Verified and logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || cleanPhone,
        avatarUrl: user.avatarUrl || '',
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    next(err);
  }
}
