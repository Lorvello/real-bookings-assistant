// Zod Validation Schemas
import { z } from 'zod';

// Authentication schemas
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .transform(email => email.toLowerCase().trim());

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  full_name: z.string()
    .min(1, 'Full name is required')
    .max(100, 'Full name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
  business_name: z.string()
    .max(100, 'Business name is too long')
    .optional(),
  business_type: z.string()
    .max(50, 'Business type is too long')
    .optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// User profile schemas
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));

export const userProfileSchema = z.object({
  full_name: z.string()
    .min(1, 'Full name is required')
    .max(100, 'Full name is too long'),
  email: emailSchema,
  phone: phoneSchema,
  business_name: z.string().max(100).optional(),
  business_type: z.string().max(50).optional(),
  business_description: z.string().max(500).optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  business_phone: phoneSchema,
  business_email: emailSchema.optional().or(z.literal('')),
  business_street: z.string().max(100).optional(),
  business_number: z.string().max(20).optional(),
  business_postal: z.string().max(20).optional(),
  business_city: z.string().max(50).optional(),
  business_country: z.string().max(50).optional()
});

// Calendar schemas
export const calendarSchema = z.object({
  name: z.string()
    .min(1, 'Calendar name is required')
    .max(100, 'Calendar name is too long'),
  description: z.string()
    .max(500, 'Description is too long')
    .optional(),
  timezone: z.string()
    .min(1, 'Timezone is required'),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional()
});

export const slugSchema = z.string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug is too long')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .refine(slug => !slug.startsWith('-') && !slug.endsWith('-'), 'Slug cannot start or end with a hyphen');

// Service type schemas
export const serviceTypeSchema = z.object({
  name: z.string()
    .min(1, 'Service name is required')
    .max(100, 'Service name is too long'),
  description: z.string()
    .max(500, 'Description is too long')
    .optional(),
  duration: z.number()
    .min(5, 'Duration must be at least 5 minutes')
    .max(480, 'Duration cannot exceed 8 hours'),
  price: z.number()
    .min(0, 'Price cannot be negative')
    .max(10000, 'Price is too high')
    .optional(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
  preparation_time: z.number()
    .min(0, 'Preparation time cannot be negative')
    .max(120, 'Preparation time cannot exceed 2 hours')
    .optional(),
  cleanup_time: z.number()
    .min(0, 'Cleanup time cannot be negative')
    .max(120, 'Cleanup time cannot exceed 2 hours')
    .optional(),
  max_attendees: z.number()
    .min(1, 'Must allow at least 1 attendee')
    .max(100, 'Cannot exceed 100 attendees')
    .optional()
});

// Booking schemas
export const bookingSchema = z.object({
  customer_name: z.string()
    .min(1, 'Customer name is required')
    .max(100, 'Customer name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Customer name can only contain letters, spaces, hyphens, and apostrophes'),
  customer_email: emailSchema,
  customer_phone: phoneSchema,
  start_time: z.string()
    .refine(date => !isNaN(Date.parse(date)), 'Invalid start time'),
  end_time: z.string()
    .refine(date => !isNaN(Date.parse(date)), 'Invalid end time'),
  service_type_id: z.string().uuid('Invalid service type'),
  notes: z.string()
    .max(1000, 'Notes are too long')
    .optional()
}).refine(data => {
  const start = new Date(data.start_time);
  const end = new Date(data.end_time);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['end_time']
}).refine(data => {
  const start = new Date(data.start_time);
  return start > new Date();
}, {
  message: 'Booking time must be in the future',
  path: ['start_time']
});

// Availability schemas
export const timeSchema = z.string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)');

export const availabilityRuleSchema = z.object({
  day_of_week: z.number()
    .min(1, 'Day of week must be between 1 and 7')
    .max(7, 'Day of week must be between 1 and 7'),
  start_time: timeSchema,
  end_time: timeSchema,
  is_available: z.boolean()
}).refine(data => {
  if (!data.is_available) return true;
  
  const start = data.start_time.split(':').map(Number);
  const end = data.end_time.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  return endMinutes > startMinutes;
}, {
  message: 'End time must be after start time',
  path: ['end_time']
});

// Security schemas
export const ipAddressSchema = z.string()
  .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, 'Invalid IP address');

export const userAgentSchema = z.string()
  .max(500, 'User agent is too long');

// File upload schemas
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().optional().default(5 * 1024 * 1024), // 5MB default
  allowedTypes: z.array(z.string()).optional().default(['image/jpeg', 'image/png', 'image/gif'])
}).refine(data => data.file.size <= data.maxSize, {
  message: 'File size exceeds maximum allowed size',
  path: ['file']
}).refine(data => data.allowedTypes.includes(data.file.type), {
  message: 'File type not allowed',
  path: ['file']
});

// API response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional()
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
});

// Search schemas
export const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query is too long'),
  filters: z.record(z.any()).optional(),
  ...paginationSchema.shape
});