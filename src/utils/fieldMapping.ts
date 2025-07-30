// Field classifications for settings management
export const BUSINESS_FIELDS = [
  'business_name',
  'business_type', 
  'business_type_other',
  'business_phone',
  'business_email',
  'business_whatsapp',
  'business_street',
  'business_number',
  'business_postal',
  'business_city',
  'business_country',
  'business_description',
  'parking_info',
  'public_transport_info',
  'accessibility_info',
  'other_info',
  'show_opening_hours',
  'opening_hours_note',
  'team_size'
] as const;

export const PROFILE_FIELDS = [
  'full_name',
  'email',
  'phone',
  'date_of_birth',
  'gender',
  'language',
  'timezone',
  'avatar_url',
  'address_street',
  'address_number',
  'address_postal',
  'address_city',
  'address_country',
  'website',
  'facebook',
  'instagram',
  'linkedin',
  'tiktok'
] as const;

export type BusinessField = typeof BUSINESS_FIELDS[number];
export type ProfileField = typeof PROFILE_FIELDS[number];

/**
 * Check if a field belongs to business data
 */
export const isBusinessField = (field: string): field is BusinessField => {
  return BUSINESS_FIELDS.includes(field as BusinessField);
};

/**
 * Check if a field belongs to profile data
 */
export const isProfileField = (field: string): field is ProfileField => {
  return PROFILE_FIELDS.includes(field as ProfileField);
};

/**
 * Get the field type for a given field name
 */
export const getFieldType = (field: string): 'business' | 'profile' | 'unknown' => {
  if (isBusinessField(field)) return 'business';
  if (isProfileField(field)) return 'profile';
  return 'unknown';
};