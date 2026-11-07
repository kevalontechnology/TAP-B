import { z } from 'zod';

// Strict URL validator: must be a valid URL with domain and extension
const strictOptionalUrl = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      if (/\s/.test(val)) return false;
      const candidate = /^https?:\/\//i.test(val) ? val : `https://${val}`;
      try {
        const parsed = new URL(candidate);
        return Boolean(
          (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
            parsed.hostname &&
            parsed.hostname.includes('.') &&
            parsed.hostname.split('.').pop().length >= 2
        );
      } catch {
        return false;
      }
    },
    {
      message: 'Must be a valid web link (e.g. https://example.com)',
    }
  )
  .transform((val) => {
    if (!val) return '';
    return /^https?:\/\//i.test(val) ? val : `https://${val}`;
  })
  .optional()
  .default('');

// Strict Email validator: standard RFC-compliant email structure
const strictOptionalEmail = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val);
    },
    {
      message: 'Must be a valid email address (e.g. name@domain.com)',
    }
  )
  .optional()
  .default('');

// Strict 10-Digit Phone validator: exactly 10 digits, only numeric
const strict10DigitPhone = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      let digits = val.replace(/\D/g, '');
      if (digits.length === 12 && digits.startsWith('91')) {
        digits = digits.slice(2);
      }
      return digits.length === 10;
    },
    {
      message: 'Contact number must be exactly 10 numeric digits (e.g. 9876543210)',
    }
  )
  .transform((val) => {
    if (!val) return '';
    let digits = val.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    return digits;
  })
  .optional()
  .default('');

// Strict Numeric Price validator: only digits and optional decimal
const strictNumericPrice = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      return /^\d+(\.\d{1,2})?$/.test(val);
    },
    {
      message: 'Price must be a valid numeric amount (e.g. 999 or 1499.50)',
    }
  )
  .optional()
  .default('');

// Strict UPI ID validator: alphanumeric and standard handles (e.g. name@okhdfcbank, 9876543210@ybl)
const strictOptionalUpiId = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      return /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9]{2,64}$/.test(val);
    },
    {
      message: 'Must be a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@ybl)',
    }
  )
  .transform((val) => (val ? val.toLowerCase() : ''))
  .optional()
  .default('');

// Optional Payment Handle (UPI ID or 10-digit mobile number)
const strictOptionalPaymentHandle = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      const digits = val.replace(/\D/g, '');
      const is10Digit = digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
      const isUpi = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9]{2,64}$/.test(val);
      return is10Digit || isUpi;
    },
    {
      message: 'Must be a valid UPI ID or 10-digit mobile number',
    }
  )
  .optional()
  .default('');

export const createProfileSchema = z.object({
  userId: z.string().optional(),
  profileType: z.enum(['PERSONAL', 'BUSINESS', 'EMPLOYEE', 'CUSTOM']).optional().default('CUSTOM'),
  companyCode: z.string().trim().toUpperCase().optional().default(''),
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Full name must contain letters and spaces only'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores')
    .toLowerCase()
    .trim(),
  designation: z.string().trim().max(100).optional().default(''),
  bio: z.string().trim().max(1000).optional().default(''),
  profilePhoto: z.string().optional().default(''),
  mobileNumber: strict10DigitPhone,
  whatsappNumber: strict10DigitPhone,
  email1: strictOptionalEmail,
  email2: strictOptionalEmail,
  alternatePhone: strict10DigitPhone,

  // Company
  companyName: z.string().trim().max(150).optional().default(''),
  companyLogo: z.string().optional().default(''),
  industry: z.string().trim().max(100).optional().default(''),
  companyDescription: z.string().trim().max(1500).optional().default(''),
  companyWebsite: strictOptionalUrl,
  companyAddress: z.string().trim().max(300).optional().default(''),
  googleMapsLocation: strictOptionalUrl,

  // Social Links
  linkedIn: strictOptionalUrl,
  instagram: strictOptionalUrl,
  facebook: strictOptionalUrl,
  youtube: strictOptionalUrl,
  twitter: strictOptionalUrl,
  github: strictOptionalUrl,
  portfolio: strictOptionalUrl,
  googleReview: strictOptionalUrl,
  customLinks: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().trim().min(1, 'Label is required'),
        url: strictOptionalUrl.refine((val) => Boolean(val), {
          message: 'Valid link URL is required',
        }),
        platform: z.string().optional().default('custom'),
        icon: z.string().optional().default('globe'),
      })
    )
    .optional()
    .default([]),

  // Business Content
  services: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().trim().min(1, 'Service title is required'),
        description: z.string().trim().optional().default(''),
        price: strictNumericPrice,
        icon: z.string().optional().default('briefcase'),
      })
    )
    .optional()
    .default([]),
  products: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().trim().min(1, 'Product name is required'),
        description: z.string().trim().optional().default(''),
        price: strictNumericPrice,
        image: z.string().optional().default(''),
        link: strictOptionalUrl,
      })
    )
    .optional()
    .default([]),
  portfolioItems: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().trim().min(1, 'Project title is required'),
        description: z.string().trim().optional().default(''),
        image: z.string().optional().default(''),
        link: strictOptionalUrl,
      })
    )
    .optional()
    .default([]),
  imageGallery: z
    .array(
      z.object({
        id: z.string(),
        url: z.string().trim().min(1, 'Image URL is required'),
        caption: z.string().trim().optional().default(''),
      })
    )
    .optional()
    .default([]),
  brochureUrl: strictOptionalUrl,

  // Payment & UPI Configuration
  upiId: strictOptionalUpiId,
  googlePay: strictOptionalPaymentHandle,
  phonePe: strictOptionalPaymentHandle,
  paytm: strictOptionalPaymentHandle,
  paymentQrImage: z.string().optional().default(''),

  // Settings
  saveContactVcf: z.boolean().optional().default(true),
  themeColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color')
    .optional()
    .default('#034665'),
  isPublic: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
});

export const updateProfileSchema = createProfileSchema.partial();
