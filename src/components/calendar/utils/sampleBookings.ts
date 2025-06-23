import { format, startOfMonth, endOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';

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

export const generateSampleBookings = (currentDate: Date): Booking[] => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  
  console.log('🏗️ Generating sample bookings for:', format(monthStart, 'MMMM yyyy', { locale: nl }));
  console.log('Month details:', { year, month, monthStart: monthStart.toISOString(), monthEnd: monthEnd.toISOString() });
  
  // Generate more diverse bookings across the entire month
  const sampleBookings: Booking[] = [];
  
  // Week 1 (dagen 1-7)
  sampleBookings.push(
    {
      id: 'sample-1',
      start_time: new Date(year, month, 2, 9, 0).toISOString(),
      end_time: new Date(year, month, 2, 10, 30).toISOString(),
      customer_name: 'Emma van Berg',
      customer_phone: '+31612345678',
      customer_email: 'emma@example.com',
      status: 'confirmed',
      service_name: 'Kapperszaak',
      service_types: {
        name: 'Knippen & Stylen',
        color: '#FF6B6B',
        duration: 90
      }
    },
    {
      id: 'sample-2',
      start_time: new Date(year, month, 3, 14, 0).toISOString(),
      end_time: new Date(year, month, 3, 15, 0).toISOString(),
      customer_name: 'Joris Petersen',
      customer_phone: '+31687654321',
      customer_email: 'joris@example.com',
      status: 'confirmed',
      service_name: 'Fysiotherapie',
      service_types: {
        name: 'Rugbehandeling',
        color: '#4ECDC4',
        duration: 60
      }
    },
    {
      id: 'sample-3',
      start_time: new Date(year, month, 4, 16, 30).toISOString(),
      end_time: new Date(year, month, 4, 17, 30).toISOString(),
      customer_name: 'Lisa de Wit',
      customer_email: 'lisa@example.com',
      status: 'confirmed',
      service_name: 'Coaching',
      service_types: {
        name: 'Life Coaching Sessie',
        color: '#95E1D3',
        duration: 60
      }
    },
    {
      id: 'sample-4',
      start_time: new Date(year, month, 5, 11, 0).toISOString(),
      end_time: new Date(year, month, 5, 12, 0).toISOString(),
      customer_name: 'Ahmed Hassan',
      customer_phone: '+31667890123',
      customer_email: 'ahmed@example.com',
      status: 'pending',
      service_name: 'Barbier',
      service_types: {
        name: 'Baard Trimmen',
        color: '#FADBD8',
        duration: 60
      }
    }
  );

  // Week 2 (dagen 8-14)
  sampleBookings.push(
    {
      id: 'sample-5',
      start_time: new Date(year, month, 8, 10, 0).toISOString(),
      end_time: new Date(year, month, 8, 11, 30).toISOString(),
      customer_name: 'Mark Johnson',
      customer_phone: '+31634567890',
      customer_email: 'mark@example.com',
      status: 'confirmed',
      service_name: 'Tandarts',
      service_types: {
        name: 'Controle & Reiniging',
        color: '#A8E6CF',
        duration: 90
      }
    },
    {
      id: 'sample-9',
      start_time: new Date(year, month, 12, 14, 0).toISOString(),
      end_time: new Date(year, month, 12, 15, 0).toISOString(),
      customer_name: 'Thomas van Dijk',
      customer_phone: '+31656789012',
      customer_email: 'thomas@example.com',
      status: 'confirmed',
      service_name: 'Acupunctuur',
      service_types: {
        name: 'Behandeling',
        color: '#85C1E9',
        duration: 60
      }
    }
  );

  // Week 3 (dagen 15-21)
  sampleBookings.push(
    {
      id: 'sample-10',
      start_time: new Date(year, month, 15, 11, 0).toISOString(),
      end_time: new Date(year, month, 15, 12, 0).toISOString(),
      customer_name: 'Anna Kowalski',
      customer_email: 'anna@example.com',
      status: 'confirmed',
      service_name: 'Massage',
      service_types: {
        name: 'Ontspanningsmassage',
        color: '#BB8FCE',
        duration: 60
      }
    },
    {
      id: 'sample-11',
      start_time: new Date(year, month, 16, 9, 30).toISOString(),
      end_time: new Date(year, month, 16, 10, 30).toISOString(),
      customer_name: 'Lars Nielsen',
      customer_phone: '+31634567812',
      customer_email: 'lars@example.com',
      status: 'confirmed',
      service_name: 'Psycholoog',
      service_types: {
        name: 'Gesprekstherapie',
        color: '#F7DC6F',
        duration: 60
      }
    },
    // Dag met meerdere afspraken
    {
      id: 'sample-12',
      start_time: new Date(year, month, 17, 10, 0).toISOString(),
      end_time: new Date(year, month, 17, 11, 0).toISOString(),
      customer_name: 'Maria Santos',
      customer_email: 'maria@example.com',
      status: 'confirmed',
      service_name: 'Schoonheidsbehandeling',
      service_types: {
        name: 'Gezichtsbehandeling',
        color: '#F8C471',
        duration: 60
      }
    },
    {
      id: 'sample-13',
      start_time: new Date(year, month, 17, 14, 0).toISOString(),
      end_time: new Date(year, month, 17, 15, 0).toISOString(),
      customer_name: 'Robert Chen',
      customer_phone: '+31645678901',
      customer_email: 'robert@example.com',
      status: 'confirmed',
      service_name: 'Diëtist',
      service_types: {
        name: 'Voedingsadvies',
        color: '#82E0AA',
        duration: 60
      }
    },
    {
      id: 'sample-20',
      start_time: new Date(year, month, 20, 13, 0).toISOString(),
      end_time: new Date(year, month, 20, 14, 0).toISOString(),
      customer_name: 'Sophie Bakker',
      customer_email: 'sophie@example.com',
      status: 'confirmed',
      service_name: 'Nagelsalon',
      service_types: {
        name: 'Manicure & Gellak',
        color: '#FFB6C1',
        duration: 60
      }
    }
  );

  // Week 4 & einde maand (dagen 22-31)
  sampleBookings.push(
    {
      id: 'sample-15',
      start_time: new Date(year, month, 22, 13, 30).toISOString(),
      end_time: new Date(year, month, 22, 14, 30).toISOString(),
      customer_name: 'Isabella Ferrari',
      customer_email: 'isabella@example.com',
      status: 'confirmed',
      service_name: 'Stemcoach',
      service_types: {
        name: 'Zangles',
        color: '#E8DAEF',
        duration: 60
      }
    },
    {
      id: 'sample-16',
      start_time: new Date(year, month, 25, 11, 0).toISOString(),
      end_time: new Date(year, month, 25, 12, 30).toISOString(),
      customer_name: 'Jin Watanabe',
      customer_phone: '+31678901234',
      customer_email: 'jin@example.com',
      status: 'confirmed',
      service_name: 'Chiropractor',
      service_types: {
        name: 'Wervelkolom Behandeling',
        color: '#AED6F1',
        duration: 90
      }
    }
  );

  // Filter alleen bookings binnen de huidige maand
  const validBookings = sampleBookings.filter(booking => {
    const bookingDate = new Date(booking.start_time);
    const isValid = bookingDate >= monthStart && bookingDate <= monthEnd;
    
    console.log(`Booking ${booking.customer_name} on ${bookingDate.toLocaleDateString()}:`, {
      bookingDate: bookingDate.toISOString(),
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      isValid
    });
    
    return isValid;
  });

  console.log(`✅ Generated ${validBookings.length} valid sample bookings for ${format(monthStart, 'MMMM yyyy', { locale: nl })}`);
  console.log('Valid bookings:', validBookings.map(b => ({
    name: b.customer_name,
    date: new Date(b.start_time).toLocaleDateString(),
    service: b.service_name
  })));
  
  return validBookings;
};
