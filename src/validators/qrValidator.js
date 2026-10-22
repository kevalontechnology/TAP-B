import { z } from 'zod';

export const createQrSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100).trim(),
  description: z.string().max(500).optional().default(''),
  destinationType: z.enum(['WEBSITE', 'TAPZY_PROFILE', 'CUSTOM_DATA']).default('WEBSITE'),
  destinationUrl: z.string().optional().default(''),
  customData: z.any().optional().default(null),
  expiresAt: z.string().datetime().nullable().optional(),
  style: z
    .object({
      fgColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').optional().default('#000000'),
      bgColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').optional().default('#FFFFFF'),
      logoUrl: z.string().optional().default(''),
    })
    .optional(),
  assignedTo: z
    .object({
      customerName: z.string().optional().default(''),
      customerRefId: z.string().optional().default(''),
      note: z.string().optional().default(''),
    })
    .optional(),
});

export const bulkQrSchema = z.object({
  batchName: z.string().min(2, 'Batch name must be at least 2 characters').max(100).trim(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(5000, 'Maximum batch size is 5000'),
  fgColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').optional().default('#000000'),
  bgColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').optional().default('#FFFFFF'),
});

export const assignQrSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').trim(),
  customerRefId: z.string().optional().default(''),
  destinationType: z.enum(['WEBSITE', 'TAPZY_PROFILE', 'CUSTOM_DATA']).default('WEBSITE'),
  destinationUrl: z.string().min(1, 'Destination URL is required').trim(),
  customData: z.any().optional().default(null),
  note: z.string().optional().default(''),
});

export const updateDestinationSchema = z.object({
  destinationType: z.enum(['WEBSITE', 'TAPZY_PROFILE', 'CUSTOM_DATA']).default('WEBSITE'),
  destinationUrl: z.string().min(1, 'Destination URL is required').trim(),
  customData: z.any().optional().default(null),
});

export const updateStatusSchema = z.object({
  status: z.enum(['UNASSIGNED', 'ACTIVE', 'DISABLED', 'EXPIRED']),
});
