
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  business_name?: string;
  business_type?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Calendar {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export type BusinessType = 'salon' | 'clinic' | 'consultant' | 'trainer' | 'other';
