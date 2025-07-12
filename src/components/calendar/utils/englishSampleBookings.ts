import { format, startOfMonth, endOfMonth } from 'date-fns';

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  status: string;
  service_name?: string;
  notes?: string;
  internal_notes?: string;
  total_price?: number;
  service_types?: {
    name: string;
    color: string;
    duration: number;
    description?: string;
  } | null;
}

export const generateEnglishSampleBookings = (currentDate: Date): Booking[] => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  
  console.log('Generating English sample bookings for:', format(monthStart, 'MMMM yyyy'));
  
  const sampleBookings: Booking[] = [
    // Week 1 - Early July
    {
      id: 'sample-1',
      start_time: new Date(year, month, 2, 9, 0).toISOString(),
      end_time: new Date(year, month, 2, 10, 30).toISOString(),
      customer_name: 'Emily Johnson',
      customer_phone: '+1234567890',
      customer_email: 'emily@example.com',
      status: 'confirmed',
      service_name: 'Hair Salon',
      service_types: {
        name: 'Cut & Style',
        color: '#FF6B6B',
        duration: 90
      }
    },
    {
      id: 'sample-2',
      start_time: new Date(year, month, 3, 14, 0).toISOString(),
      end_time: new Date(year, month, 3, 15, 0).toISOString(),
      customer_name: 'Michael Brown',
      customer_phone: '+1987654321',
      customer_email: 'michael@example.com',
      status: 'confirmed',
      service_name: 'Physical Therapy',
      service_types: {
        name: 'Back Treatment',
        color: '#4ECDC4',
        duration: 60
      }
    },
    {
      id: 'sample-3',
      start_time: new Date(year, month, 4, 16, 30).toISOString(),
      end_time: new Date(year, month, 4, 17, 30).toISOString(),
      customer_name: 'Sarah Wilson',
      customer_email: 'sarah@example.com',
      status: 'confirmed',
      service_name: 'Life Coaching',
      service_types: {
        name: 'Coaching Session',
        color: '#95E1D3',
        duration: 60
      }
    },
    {
      id: 'sample-4',
      start_time: new Date(year, month, 5, 11, 0).toISOString(),
      end_time: new Date(year, month, 5, 12, 0).toISOString(),
      customer_name: 'Alex Rodriguez',
      customer_phone: '+1567890123',
      customer_email: 'alex@example.com',
      status: 'pending',
      service_name: 'Barbershop',
      service_types: {
        name: 'Beard Trim',
        color: '#FADBD8',
        duration: 60
      }
    },
    
    // Week 2 - More appointments
    {
      id: 'sample-5',
      start_time: new Date(year, month, 8, 10, 0).toISOString(),
      end_time: new Date(year, month, 8, 11, 30).toISOString(),
      customer_name: 'Jessica Davis',
      customer_phone: '+1634567890',
      customer_email: 'jessica@example.com',
      status: 'confirmed',
      service_name: 'Dental Care',
      service_types: {
        name: 'Checkup & Cleaning',
        color: '#A8E6CF',
        duration: 90
      }
    },
    {
      id: 'sample-6',
      start_time: new Date(year, month, 9, 13, 0).toISOString(),
      end_time: new Date(year, month, 9, 14, 0).toISOString(),
      customer_name: 'Amanda Taylor',
      customer_email: 'amanda@example.com',
      status: 'confirmed',
      service_name: 'Nail Salon',
      service_types: {
        name: 'Manicure & Gel',
        color: '#FFB6C1',
        duration: 60
      }
    },
    {
      id: 'sample-7',
      start_time: new Date(year, month, 10, 15, 30).toISOString(),
      end_time: new Date(year, month, 10, 16, 30).toISOString(),
      customer_name: 'James Miller',
      customer_phone: '+1623456789',
      customer_email: 'james@example.com',
      status: 'confirmed',
      service_name: 'Personal Training',
      service_types: {
        name: 'Fitness Coaching',
        color: '#F39C12',
        duration: 60
      }
    },
    {
      id: 'sample-8',
      start_time: new Date(year, month, 11, 9, 0).toISOString(),
      end_time: new Date(year, month, 11, 10, 0).toISOString(),
      customer_name: 'Rachel Green',
      customer_email: 'rachel@example.com',
      status: 'confirmed',
      service_name: 'Yoga Studio',
      service_types: {
        name: 'Private Yoga Session',
        color: '#D7BDE2',
        duration: 60
      }
    },
    {
      id: 'sample-9',
      start_time: new Date(year, month, 12, 14, 0).toISOString(),
      end_time: new Date(year, month, 12, 15, 0).toISOString(),
      customer_name: 'Christopher Lee',
      customer_phone: '+1556789012',
      customer_email: 'chris@example.com',
      status: 'confirmed',
      service_name: 'Acupuncture',
      service_types: {
        name: 'Treatment Session',
        color: '#85C1E9',
        duration: 60
      }
    },
    
    // Week 3 - Multiple appointments per day
    {
      id: 'sample-10',
      start_time: new Date(year, month, 15, 11, 0).toISOString(),
      end_time: new Date(year, month, 15, 12, 0).toISOString(),
      customer_name: 'Olivia Martinez',
      customer_email: 'olivia@example.com',
      status: 'confirmed',
      service_name: 'Massage Therapy',
      service_types: {
        name: 'Relaxation Massage',
        color: '#BB8FCE',
        duration: 60
      }
    },
    {
      id: 'sample-11',
      start_time: new Date(year, month, 16, 9, 30).toISOString(),
      end_time: new Date(year, month, 16, 10, 30).toISOString(),
      customer_name: 'Daniel Anderson',
      customer_phone: '+1634567812',
      customer_email: 'daniel@example.com',
      status: 'confirmed',
      service_name: 'Psychology',
      service_types: {
        name: 'Therapy Session',
        color: '#F7DC6F',
        duration: 60
      }
    },
    
    // Day with multiple bookings
    {
      id: 'sample-12',
      start_time: new Date(year, month, 17, 10, 0).toISOString(),
      end_time: new Date(year, month, 17, 11, 0).toISOString(),
      customer_name: 'Sophia Garcia',
      customer_email: 'sophia@example.com',
      status: 'confirmed',
      service_name: 'Beauty Treatment',
      service_types: {
        name: 'Facial Treatment',
        color: '#F8C471',
        duration: 60
      }
    },
    {
      id: 'sample-13',
      start_time: new Date(year, month, 17, 14, 0).toISOString(),
      end_time: new Date(year, month, 17, 15, 0).toISOString(),
      customer_name: 'Kevin White',
      customer_phone: '+1645678901',
      customer_email: 'kevin@example.com',
      status: 'confirmed',
      service_name: 'Nutritionist',
      service_types: {
        name: 'Dietary Consultation',
        color: '#82E0AA',
        duration: 60
      }
    },
    {
      id: 'sample-14',
      start_time: new Date(year, month, 17, 16, 30).toISOString(),
      end_time: new Date(year, month, 17, 17, 30).toISOString(),
      customer_name: 'Maya Patel',
      customer_email: 'maya@example.com',
      status: 'pending',
      service_name: 'Yoga Studio',
      service_types: {
        name: 'Private Yoga Session',
        color: '#D7BDE2',
        duration: 60
      }
    },
    
    // Week 4 & End of month
    {
      id: 'sample-15',
      start_time: new Date(year, month, 22, 13, 30).toISOString(),
      end_time: new Date(year, month, 22, 14, 30).toISOString(),
      customer_name: 'Grace Thompson',
      customer_email: 'grace@example.com',
      status: 'confirmed',
      service_name: 'Voice Coaching',
      service_types: {
        name: 'Singing Lesson',
        color: '#E8DAEF',
        duration: 60
      }
    },
    {
      id: 'sample-16',
      start_time: new Date(year, month, 23, 11, 0).toISOString(),
      end_time: new Date(year, month, 23, 12, 30).toISOString(),
      customer_name: 'Ryan Clark',
      customer_phone: '+1678901234',
      customer_email: 'ryan@example.com',
      status: 'confirmed',
      service_name: 'Chiropractic',
      service_types: {
        name: 'Spine Treatment',
        color: '#AED6F1',
        duration: 90
      }
    },
    {
      id: 'sample-17',
      start_time: new Date(year, month, 24, 15, 0).toISOString(),
      end_time: new Date(year, month, 24, 16, 0).toISOString(),
      customer_name: 'Isabella Cruz',
      customer_email: 'isabella@example.com',
      status: 'confirmed',
      service_name: 'Dance Lessons',
      service_types: {
        name: 'Salsa Workshop',
        color: '#F1948A',
        duration: 60
      }
    },
    {
      id: 'sample-18',
      start_time: new Date(year, month, 25, 10, 0).toISOString(),
      end_time: new Date(year, month, 25, 11, 0).toISOString(),
      customer_name: 'Nathan Hill',
      customer_phone: '+1612987654',
      customer_email: 'nathan@example.com',
      status: 'pending',
      service_name: 'Personal Trainer',
      service_types: {
        name: 'Strength Training',
        color: '#52C41A',
        duration: 60
      }
    },
    
    // End of month appointments
    {
      id: 'sample-19',
      start_time: new Date(year, month, 29, 12, 0).toISOString(),
      end_time: new Date(year, month, 29, 13, 0).toISOString(),
      customer_name: 'Zoe Adams',
      customer_email: 'zoe@example.com',
      status: 'confirmed',
      service_name: 'Henna Art',
      service_types: {
        name: 'Traditional Henna',
        color: '#D4A574',
        duration: 60
      }
    },
    {
      id: 'sample-20',
      start_time: new Date(year, month, 30, 10, 30).toISOString(),
      end_time: new Date(year, month, 30, 11, 30).toISOString(),
      customer_name: 'Marcus King',
      customer_phone: '+1634521789',
      customer_email: 'marcus@example.com',
      status: 'confirmed',
      service_name: 'Tarot Reading',
      service_types: {
        name: 'Spiritual Consultation',
        color: '#D5A6BD',
        duration: 60
      }
    }
  ];

  // Filter out bookings that don't fall within the current month
  const validBookings = sampleBookings.filter(booking => {
    const bookingDate = new Date(booking.start_time);
    return bookingDate >= monthStart && bookingDate <= monthEnd;
  });

  console.log(`Generated ${validBookings.length} valid English sample bookings for ${format(monthStart, 'MMMM yyyy')}`);
  
  return validBookings;
};