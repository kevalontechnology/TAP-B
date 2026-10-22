import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .refine((val) => !val || /^https?:\/\//i.test(val), {
    message: 'Must be a valid URL starting with http:// or https://',
  })
  .optional()
  .default('');

const optionalEmail = z
  .string()
  .trim()
  .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'Must be a valid email address',
  })
  .optional()
  .default('');

export const createProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').trim(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores')
    .toLowerCase()
    .trim(),
  designation: z.string().trim().optional().default(''),
  bio: z.string().trim().optional().default(''),
  profilePhoto: z.string().optional().default(''),
  mobileNumber: z.string().trim().optional().default(''),
  whatsappNumber: z.string().trim().optional().default(''),
  email1: optionalEmail,
  email2: optionalEmail,
  alternatePhone: z.string().trim().optional().default(''),

  // Company
  companyName: z.string().trim().optional().default(''),
  companyLogo: z.string().optional().default(''),
  industry: z.string().trim().optional().default(''),
  companyDescription: z.string().trim().optional().default(''),
  companyWebsite: optionalUrl,
  companyAddress: z.string().trim().optional().default(''),
  googleMapsLocation: optionalUrl,

  // Social Links
  linkedIn: optionalUrl,
  instagram: optionalUrl,
  facebook: optionalUrl,
  youtube: optionalUrl,
  twitter: optionalUrl,
  github: optionalUrl,
  portfolio: optionalUrl,
  googleReview: optionalUrl,
  customLinks: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().min(1, 'Label is required'),
        url: z.string().min(1, 'URL is required'),
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
        title: z.string().min(1, 'Service title is required'),
        description: z.string().optional().default(''),
        price: z.string().optional().default(''),
        icon: z.string().optional().default('briefcase'),
      })
    )
    .optional()
    .default([]),
  products: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1, 'Product name is required'),
        description: z.string().optional().default(''),
        price: z.string().optional().default(''),
        image: z.string().optional().default(''),
        link: z.string().optional().default(''),
      })
    )
    .optional()
    .default([]),
  portfolioItems: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1, 'Project title is required'),
        description: z.string().optional().default(''),
        image: z.string().optional().default(''),
        link: z.string().optional().default(''),
      })
    )
    .optional()
    .default([]),
  imageGallery: z
    .array(
      z.object({
        id: z.string(),
        url: z.string().min(1, 'Image URL is required'),
        caption: z.string().optional().default(''),
      })
    )
    .optional()
    .default([]),
  brochureUrl: optionalUrl,

  // Settings
  saveContactVcf: z.boolean().optional().default(true),
  themeColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').optional().default('#034665'),
  isPublic: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
});

export const updateProfileSchema = createProfileSchema.partial();
