import { format, startOfMonth, endOfMonth, addDays, addHours, setHours, setMinutes } from 'date-fns';

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

export function generateDutchSampleBookings(currentDate: Date): Booking[] {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const dutchCustomers = [
    'Emma Janssen', 'Michael Bakker', 'Sofia Visser', 'David Smit', 
    'Lisa de Jong', 'James van Dijk', 'Anna Mulder', 'Roberto Koning',
    'Sophie van der Berg', 'Mark Peters', 'Sarah de Vries', 'Tim Jansen'
  ];
  
  const dutchServices = [
    'Knippen', 'Massage', 'Consult', 'Gezichtsbehandeling', 
    'Manicure', 'Training', 'Therapie', 'Controle'
  ];
  
  const bookings: Booking[] = [];
  
  // Generate bookings for various days in the month
  const daysWithBookings = [2, 5, 8, 10, 12, 15, 18, 20, 22, 25, 28];
  
  let bookingId = 1;
  
  daysWithBookings.forEach(dayOffset => {
    const bookingDate = addDays(monthStart, dayOffset);
    
    // Skip if date is beyond current month
    if (bookingDate > monthEnd) return;
    
    // Generate 1-3 bookings per day
    const numBookings = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numBookings; i++) {
      const startHour = 9 + Math.floor(Math.random() * 8); // 9 AM to 5 PM
      const startMinute = Math.random() > 0.5 ? 0 : 30;
      const duration = [30, 60, 90][Math.floor(Math.random() * 3)]; // 30, 60, or 90 minutes
      
      const startTime = setMinutes(setHours(bookingDate, startHour), startMinute);
      const endTime = addHours(startTime, duration / 60);
      
      const customerName = dutchCustomers[Math.floor(Math.random() * dutchCustomers.length)];
      const serviceName = dutchServices[Math.floor(Math.random() * dutchServices.length)];
      
      const booking: Booking = {
        id: `booking-${bookingId}`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        customer_name: customerName,
        customer_phone: `06${Math.floor(Math.random() * 90000000) + 10000000}`,
        customer_email: `${customerName.toLowerCase().replace(' ', '.')}@email.nl`,
        status: Math.random() > 0.1 ? 'confirmed' : 'pending',
        service_name: serviceName,
        total_price: Math.floor(Math.random() * 150) + 25, // €25-175
        service_types: {
          name: serviceName,
          color: ['emerald', 'blue', 'purple', 'orange', 'pink'][Math.floor(Math.random() * 5)],
          duration: duration,
          description: `${serviceName} behandeling`
        }
      };
      
      bookings.push(booking);
      bookingId++;
    }
  });
  
  return bookings.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}