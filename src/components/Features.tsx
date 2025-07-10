import { LightningBoltIcon as BoltIcon, GearIcon, CalendarIcon, Link2Icon, BellIcon, BarChartIcon as BarChart3Icon, GlobeIcon, DesktopIcon as MonitorIcon } from "@radix-ui/react-icons";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Check, Calendar, Users, MessageCircle, Clock, CheckCircle, Activity } from "lucide-react";
import { TranslationDemo } from "@/components/TranslationDemo";

const Features = () => {
  // AI Agent Personalization State
  const [tonePosition, setTonePosition] = useState(33); // 33% for "Friendly"
  const [multiLanguage, setMultiLanguage] = useState(true);
  const [smartFAQ, setSmartFAQ] = useState(true);
  const [smartBooking, setSmartBooking] = useState(true);
  const [contextAI, setContextAI] = useState(true);
  const [proactiveMode, setProactiveMode] = useState(false);
  
  // Slider drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState(0);
  const animationFrameRef = useRef<number>();
  const sliderRef = useRef<HTMLDivElement>(null);
  
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const calendarRef = useRef<HTMLDivElement>(null);
  
  // Slideshow state for Real-time Dashboard Monitoring
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Smooth slider dragging with global event listeners and requestAnimationFrame
  const updateSliderPosition = useCallback((clientX: number) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      const clampedPercentage = Math.max(0, Math.min(100, percentage));
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(() => {
        setTonePosition(clampedPercentage);
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      updateSliderPosition(e.clientX);
    }
  }, [isDragging, updateSliderPosition]);

  const handleSliderTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging && e.touches[0]) {
      e.preventDefault();
      updateSliderPosition(e.touches[0].clientX);
    }
  }, [isDragging, updateSliderPosition]);

  const handleSliderMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isDragging]);

  const handleSliderTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isDragging]);

  // Global event listeners for smooth dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleSliderMouseUp);
      document.addEventListener('touchmove', handleSliderTouchMove, { passive: false });
      document.addEventListener('touchend', handleSliderTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleSliderMouseUp);
        document.removeEventListener('touchmove', handleSliderTouchMove);
        document.removeEventListener('touchend', handleSliderTouchEnd);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isDragging, handleMouseMove, handleSliderMouseUp, handleSliderTouchMove, handleSliderTouchEnd]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Extended booking data for both views
  const bookings = {
    2: { 
      id: 1, 
      name: "John Peterson", 
      service: "Personal Training", 
      time: "9:00", 
      duration: "60 min",
      phone: "+31 6 1234 5678",
      email: "john@example.com",
      status: "confirmed",
      notes: "Focuses on strength training and weight loss"
    },
    4: { 
      id: 2, 
      name: "Sarah Johnson", 
      service: "Yoga Class", 
      time: "10:30", 
      duration: "90 min",
      phone: "+31 6 2345 6789",
      email: "sarah@example.com",
      status: "confirmed",
      notes: "Beginner level, prefers morning sessions"
    },
    7: { 
      id: 3, 
      name: "Mike Williams", 
      service: "Massage Therapy", 
      time: "14:00", 
      duration: "45 min",
      phone: "+31 6 3456 7890",
      email: "mike@example.com",
      status: "confirmed",
      notes: "Deep tissue massage for sports recovery"
    },
    9: { 
      id: 4, 
      name: "Emma Davis", 
      service: "Pilates Session", 
      time: "11:00", 
      duration: "60 min",
      phone: "+31 6 4567 8901",
      email: "emma@example.com",
      status: "pending",
      notes: "Rehabilitation exercises for lower back"
    },
    11: { 
      id: 5, 
      name: "Tom Brown", 
      service: "CrossFit Training", 
      time: "16:00", 
      duration: "75 min",
      phone: "+31 6 5678 9012",
      email: "tom@example.com",
      status: "confirmed",
      notes: "High intensity workout, experienced athlete"
    },
    14: { 
      id: 6, 
      name: "Lisa Garcia", 
      service: "Nutrition Consultation", 
      time: "13:30", 
      duration: "45 min",
      phone: "+31 6 6789 0123",
      email: "lisa@example.com",
      status: "confirmed",
      notes: "Weight management and meal planning"
    },
    15: { 
      id: 7, 
      name: "Dave Miller", 
      service: "Personal Training", 
      time: "8:00", 
      duration: "60 min",
      phone: "+31 6 7890 1234",
      email: "dave@example.com",
      status: "confirmed",
      notes: "Early morning session, cardio focus"
    },
    17: { 
      id: 8, 
      name: "Anna Wilson", 
      service: "Evening Yoga", 
      time: "18:00", 
      duration: "90 min",
      phone: "+31 6 8901 2345",
      email: "anna@example.com",
      status: "confirmed",
      notes: "Relaxation and stress relief session"
    },
    18: { 
      id: 9, 
      name: "Chris Martinez", 
      service: "Sports Massage", 
      time: "15:30", 
      duration: "60 min",
      phone: "+31 6 9012 3456",
      email: "chris@example.com",
      status: "confirmed",
      notes: "Pre-competition preparation massage"
    },
    21: { 
      id: 10, 
      name: "Kate Thompson", 
      service: "Pilates Mat Class", 
      time: "12:00", 
      duration: "60 min",
      phone: "+31 6 0123 4567",
      email: "kate@example.com",
      status: "confirmed",
      notes: "Core strengthening and flexibility"
    },
    22: { 
      id: 11, 
      name: "Ben Anderson", 
      service: "CrossFit WOD", 
      time: "17:00", 
      duration: "60 min",
      phone: "+31 6 1234 5670",
      email: "ben@example.com",
      status: "confirmed",
      notes: "Workout of the day, group session"
    },
    24: { 
      id: 12, 
      name: "Mia Taylor", 
      service: "Nutrition & Lifestyle", 
      time: "10:00", 
      duration: "60 min",
      phone: "+31 6 2345 6701",
      email: "mia@example.com",
      status: "pending",
      notes: "First consultation, weight loss goals"
    },
    25: { 
      id: 13, 
      name: "Sam Rodriguez", 
      service: "Strength Training", 
      time: "14:30", 
      duration: "75 min",
      phone: "+31 6 3456 7012",
      email: "sam@example.com",
      status: "confirmed",
      notes: "Powerlifting focused training session"
    },
    28: { 
      id: 14, 
      name: "Alex Moore", 
      service: "Yin Yoga", 
      time: "19:00", 
      duration: "90 min",
      phone: "+31 6 4567 0123",
      email: "alex@example.com",
      status: "confirmed",
      notes: "Restorative yoga for deep relaxation"
    },
    30: { 
      id: 15, 
      name: "Zoe White", 
      service: "Therapeutic Massage", 
      time: "11:30", 
      duration: "60 min",
      phone: "+31 6 5670 1234",
      email: "zoe@example.com",
      status: "confirmed",
      notes: "Injury recovery and pain management"
    }
  };

  const handleBookingClick = (booking: any, event: React.MouseEvent) => {
    event.stopPropagation();
    const targetRect = (event.target as HTMLElement).getBoundingClientRect();
    
    // Get calendar container bounds for relative positioning
    const calendarRect = calendarRef.current?.getBoundingClientRect();
    if (!calendarRect) return;
    
    // Calculate position relative to calendar container
    const x = targetRect.left + targetRect.width / 2 - calendarRect.left;
    const y = targetRect.top - 10 - calendarRect.top;
    
    // Check calendar boundaries and adjust position
    const calendarWidth = calendarRect.width;
    const calendarHeight = calendarRect.height;
    const popupWidth = 280;
    const popupHeight = 300;
    
    let adjustedX = x;
    let adjustedY = y;
    
    // Flip horizontally if popup would go off calendar
    if (x + popupWidth / 2 > calendarWidth - 20) {
      adjustedX = calendarWidth - popupWidth / 2 - 20;
    } else if (x - popupWidth / 2 < 20) {
      adjustedX = popupWidth / 2 + 20;
    }
    
    // Flip vertically if popup would go off calendar
    if (y - popupHeight < 20) {
      adjustedY = targetRect.bottom - calendarRect.top + 10;
    }
    
    setPopupPosition({ x: adjustedX, y: adjustedY });
    setSelectedBooking(booking);
    setShowPopup(true);
  };

  // Handle escape key and click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPopup) {
        setShowPopup(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (showPopup && !(e.target as Element).closest('[data-popup]')) {
        setShowPopup(false);
      }
    };

    if (showPopup) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopup]);

  // Slideshow touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentSlide === 0) {
      setCurrentSlide(1);
    }
    if (isRightSwipe && currentSlide === 1) {
      setCurrentSlide(0);
    }
  };

  const handleSlideToggle = () => {
    setCurrentSlide(currentSlide === 0 ? 1 : 0);
  };
  const bookingFeatures = [{
    Icon: BoltIcon,
    name: "100% Automatic Bookings",
    description: "No manual intervention needed. Books, confirms and reschedules automatically",
    href: "/features/automation",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          
          {/* Background container for iPhone mockup */}
          <div className="absolute top-3 left-3 right-3 bottom-3 bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 backdrop-blur-sm">
            {/* iPhone Mockup - positioned in upper 70%, centered */}
            <div className="absolute top-0 left-0 right-0 h-[75%] flex justify-center items-center">
              <div className="w-60 h-[85%] transform rotate-3 hover:rotate-0 transition-transform duration-500 ease-in-out">
                {/* iPhone outer frame */}
                <div className="relative bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-[2.5rem] p-[3px] shadow-2xl h-full border border-gray-700">
                  {/* iPhone screen bezel */}
                  <div className="relative bg-black rounded-[2.2rem] p-[4px] h-full">
                    {/* iPhone screen */}
                    <div className="bg-white rounded-[1.8rem] relative h-full flex flex-col overflow-hidden shadow-inner">
                  {/* iPhone notch */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-3 bg-black rounded-b-lg z-10"></div>
                  
                  {/* WhatsApp header */}
                  <div className="bg-[#25D366] text-white px-2 py-1.5 flex items-center gap-1.5 pt-4">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-xs">🤖</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[8px]">Dental Care AI</h3>
                      <p className="text-[6px] text-white/90">online</p>
                    </div>
                  </div>
                  
                    {/* Chat area - fills exactly from header to input */}
                    <div className="bg-[#e5ddd5] flex-1 flex flex-col justify-between p-2 py-3">
                      <div className="space-y-2">
                      {/* Customer message */}
                        <div className="flex justify-end">
                        <div className="bg-[#dcf8c6] rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                          <p className="text-gray-800 text-[9px] font-medium leading-tight">Hi, I need to reschedule my appointment</p>
                        </div>
                    </div>
                    
                      {/* AI response 1 */}
                      <div className="flex justify-start">
                        <div className="bg-white rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                          <p className="text-gray-800 text-[9px] font-medium leading-tight">Of course! You have a cleaning scheduled for tomorrow at 2:00 PM. When would work better for you?</p>
                        </div>
                    </div>
                    
                    
                      {/* Customer choice */}
                      <div className="flex justify-end">
                        <div className="bg-[#dcf8c6] rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                          <p className="text-gray-800 text-[9px] font-medium leading-tight">Can we move it to next week Friday?</p>
                        </div>
                    </div>
                    
                      {/* AI response 3 - time slots */}
                      <div className="flex justify-start">
                        <div className="bg-white rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                          <p className="text-gray-800 text-[9px] font-medium leading-tight">Perfect! Here are available times for Friday:<br />🕐 9:00 AM<br />🕐 1:00 PM<br />🕐 4:00 PM</p>
                        </div>
                    </div>
                    
                      {/* Customer time choice */}
                      <div className="flex justify-end">
                        <div className="bg-[#dcf8c6] rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                          <p className="text-gray-800 text-[9px] font-medium leading-tight">4:00 PM works</p>
                        </div>
                    </div>
                    
                      {/* Final confirmation */}
                      <div className="flex justify-start">
                        <div className="bg-white rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                          <p className="text-gray-800 text-[9px] font-medium leading-tight">Appointment rescheduled to Friday 4:00 PM ✅</p>
                        </div>
                      </div>
                      </div>
                    </div>
                    
                    {/* WhatsApp Input Bar */}
                    <div className="bg-gray-100 border-t border-gray-200 px-3 py-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-500 text-sm">😊</span>
                         <div className="flex-1 bg-white rounded-full px-2 py-1">
                           <div className="text-[9px] text-gray-400 font-medium">Type a message</div>
                         </div>
                        <span className="text-gray-500 text-sm">🎤</span>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
    className: "lg:row-start-1 lg:row-end-3 lg:col-start-1 lg:col-end-2",
    hideCta: true
  }, {
    Icon: GearIcon,
    name: "Fully Personalized",
    description: "Customize the AI Agent to your services, FAQs and booking logic",
    href: "/features/personalization",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          
          {/* AI Agent Customization Interface */}
          <div className="absolute top-3 left-3 right-3 bottom-3 bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 backdrop-blur-sm">
            {/* AI Personality Section */}
            <div className="mb-3">
              <p className="text-slate-300 text-[8px] font-medium mb-2">AI Personality & Tone</p>
              
               {/* Tone Slider */}
               <div className="mb-2">
                 <div className="flex justify-between text-[6px] text-slate-400 mb-1">
                   <span>Professional</span>
                   <span>Friendly</span>
                   <span>Casual</span>
                 </div>
                   <div 
                     ref={sliderRef}
                     className="relative h-1 bg-slate-600 rounded-full cursor-pointer"
                     onClick={(e) => {
                       if (!isDragging) {
                         const rect = e.currentTarget.getBoundingClientRect();
                         const x = e.clientX - rect.left;
                         const percentage = (x / rect.width) * 100;
                         setTonePosition(Math.max(0, Math.min(100, percentage)));
                       }
                     }}
                     onMouseDown={(e) => {
                       setIsDragging(true);
                       setDragStartPosition(e.clientX);
                       e.preventDefault();
                     }}
                     onTouchStart={(e) => {
                       setIsDragging(true);
                       setDragStartPosition(e.touches[0].clientX);
                       e.preventDefault();
                     }}
                   >
                     <div 
                       className={`absolute w-2 h-2 bg-primary rounded-full -top-0.5 shadow-sm cursor-pointer ${
                         isDragging ? 'scale-110 transition-none' : 'transition-all duration-200 hover:scale-110'
                       }`}
                       style={{ left: `${tonePosition}%`, transform: 'translateX(-50%)' }}
                     />
                  </div>
               </div>
               
                {/* Language Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-[7px]">🌐 Multi-language</span>
                  <div 
                    className={`w-4 h-2 rounded-full relative cursor-pointer transition-all duration-300 hover:scale-110 ${
                      multiLanguage ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-slate-500'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMultiLanguage(!multiLanguage);
                    }}
                  >
                    <div 
                      className={`w-1.5 h-1.5 bg-white rounded-full absolute top-0.25 shadow-sm transition-all duration-300 ${
                        multiLanguage ? 'translate-x-2' : 'translate-x-0'
                      }`} 
                    />
                  </div>
                </div>
            </div>
            
             {/* Smart Features Section - Bottom 60% in 2x2 Grid */}
             <div className="grid grid-cols-2 gap-2">
                {/* FAQ Management */}
                <div className={`bg-slate-700/40 rounded p-1.5 transition-all duration-200 hover:bg-slate-700/60 ${
                  smartFAQ ? 'border border-primary/30' : 'border border-slate-600/30'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-[7px] font-medium">📚 Smart FAQ</span>
                    <div 
                      className={`w-3 h-1.5 rounded-full relative transition-all duration-300 hover:scale-110 cursor-pointer ${
                        smartFAQ ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-slate-500'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSmartFAQ(!smartFAQ);
                      }}
                    >
                       <div className={`w-1 h-1 bg-white rounded-full absolute top-0.25 transition-all duration-300 ${
                         smartFAQ ? 'translate-x-1.5 shadow-sm' : 'translate-x-0'
                       }`} />
                    </div>
                  </div>
                 <p className={`text-[6px] transition-colors duration-200 ${
                   smartFAQ ? 'text-primary' : 'text-slate-400'
                 }`}>Auto-answers common questions</p>
               </div>
               
                {/* Booking Logic */}
                <div className={`bg-slate-700/40 rounded p-1.5 transition-all duration-200 hover:bg-slate-700/60 ${
                  smartBooking ? 'border border-primary/30' : 'border border-slate-600/30'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-[7px] font-medium">🧠 Smart Booking</span>
                    <div 
                      className={`w-3 h-1.5 rounded-full relative transition-all duration-300 hover:scale-110 cursor-pointer ${
                        smartBooking ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-slate-500'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSmartBooking(!smartBooking);
                      }}
                    >
                       <div className={`w-1 h-1 bg-white rounded-full absolute top-0.25 transition-all duration-300 ${
                         smartBooking ? 'translate-x-1.5 shadow-sm' : 'translate-x-0'
                       }`} />
                    </div>
                  </div>
                 <p className={`text-[6px] transition-colors duration-200 ${
                   smartBooking ? 'text-primary' : 'text-slate-400'
                 }`}>Upselling & rebooking</p>
               </div>
               
                {/* Context Awareness */}
                <div className={`bg-slate-700/40 rounded p-1.5 transition-all duration-200 hover:bg-slate-700/60 ${
                  contextAI ? 'border border-primary/30' : 'border border-slate-600/30'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-[7px] font-medium">🎯 Context AI</span>
                    <div 
                      className={`w-3 h-1.5 rounded-full relative transition-all duration-300 hover:scale-110 cursor-pointer ${
                        contextAI ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-slate-500'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextAI(!contextAI);
                      }}
                    >
                       <div className={`w-1 h-1 bg-white rounded-full absolute top-0.25 transition-all duration-300 ${
                         contextAI ? 'translate-x-1.5 shadow-sm' : 'translate-x-0'
                       }`} />
                    </div>
                  </div>
                 <p className={`text-[6px] transition-colors duration-200 ${
                   contextAI ? 'text-primary' : 'text-slate-400'
                 }`}>Remembers preferences</p>
               </div>
               
                {/* Proactive Engagement */}
                <div className={`bg-slate-700/40 rounded p-1.5 transition-all duration-200 hover:bg-slate-700/60 ${
                  proactiveMode ? 'border border-primary/30' : 'border border-slate-600/30'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-[7px] font-medium">⚡ Proactive</span>
                    <div 
                      className={`w-3 h-1.5 rounded-full relative transition-all duration-300 hover:scale-110 cursor-pointer ${
                        proactiveMode ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-slate-500'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setProactiveMode(!proactiveMode);
                      }}
                    >
                       <div className={`w-1 h-1 bg-white rounded-full absolute top-0.25 transition-all duration-300 ${
                         proactiveMode ? 'translate-x-1.5 shadow-sm' : 'translate-x-0'
                       }`} />
                    </div>
                  </div>
                 <p className={`text-[6px] transition-colors duration-200 ${
                   proactiveMode ? 'text-primary' : 'text-slate-400'
                 }`}>Sends follow-ups</p>
               </div>
             </div>
          </div>
        </div>,
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2"
  }, {
    Icon: CalendarIcon,
    name: "Own Calendar",
    description: "Get your own professional calendar with complete control",
    href: "/features/dashboard",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          
          {/* Full Calendar Section */}
          <div ref={calendarRef} className="absolute top-2 left-2 right-2 bottom-2 bg-slate-800/50 rounded-xl border border-slate-700/50 p-3 backdrop-blur-sm flex flex-col relative">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-white text-[12px] font-semibold">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex text-[7px] bg-slate-700/60 rounded overflow-hidden">
                  <button 
                    onClick={() => setCalendarView('month')}
                    className={`px-2 py-1 transition-colors ${
                      calendarView === 'month' 
                        ? 'bg-primary text-white' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Month
                  </button>
                  <button 
                    onClick={() => setCalendarView('week')}
                    className={`px-2 py-1 transition-colors ${
                      calendarView === 'week' 
                        ? 'bg-primary text-white' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Week
                  </button>
                </div>
              </div>
            </div>
            
            {/* Calendar Grid */}
            {calendarView === 'month' ? (
              <div className="flex-1 flex flex-col">
                <div className="grid grid-cols-7 gap-1 text-[7px] mb-2">
                  {/* Day Headers */}
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                    <div key={day} className="text-slate-400 text-center py-1 font-medium border-b border-slate-700/30">{day}</div>
                  ))}
                  
                  {/* Calendar Dates with detailed bookings */}
                  {(() => {
                    return [
                      { date: 30, isOtherMonth: true }, { date: 1, isOtherMonth: false }, { date: 2, isOtherMonth: false, booking: bookings[2] }, { date: 3, isOtherMonth: false }, { date: 4, isOtherMonth: false, booking: bookings[4] }, { date: 5, isOtherMonth: false }, { date: 6, isOtherMonth: false },
                      { date: 7, isOtherMonth: false, booking: bookings[7] }, { date: 8, isOtherMonth: false }, { date: 9, isOtherMonth: false, booking: bookings[9] }, { date: 10, isOtherMonth: false }, { date: 11, isOtherMonth: false, booking: bookings[11] }, { date: 12, isOtherMonth: false }, { date: 13, isOtherMonth: false },
                      { date: 14, isOtherMonth: false, booking: bookings[14] }, { date: 15, isOtherMonth: false, booking: bookings[15] }, { date: 16, isOtherMonth: false }, { date: 17, isOtherMonth: false, booking: bookings[17] }, { date: 18, isOtherMonth: false, booking: bookings[18] }, { date: 19, isOtherMonth: false }, { date: 20, isOtherMonth: false },
                      { date: 21, isOtherMonth: false, booking: bookings[21] }, { date: 22, isOtherMonth: false, booking: bookings[22] }, { date: 23, isOtherMonth: false }, { date: 24, isOtherMonth: false, booking: bookings[24] }, { date: 25, isOtherMonth: false, booking: bookings[25] }, { date: 26, isOtherMonth: false }, { date: 27, isOtherMonth: false },
                      { date: 28, isOtherMonth: false, booking: bookings[28] }, { date: 29, isOtherMonth: false }, { date: 30, isOtherMonth: false, booking: bookings[30] }, { date: 31, isOtherMonth: false }, { date: 1, isOtherMonth: true }, { date: 2, isOtherMonth: true }, { date: 3, isOtherMonth: true }
                    ].map((day, index) => (
                      <div key={index} className="relative">
                        <div className={`text-center py-1 h-14 flex flex-col items-center justify-start text-[7px] transition-colors rounded ${
                          day.booking 
                            ? 'bg-primary/80 text-white font-medium border border-primary/50 cursor-pointer hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 ease-out' 
                            : day.isOtherMonth 
                              ? 'text-slate-500 hover:bg-slate-700/30' 
                              : 'text-slate-300 hover:bg-slate-700/50'
                        }`}
                        onClick={day.booking ? (e) => handleBookingClick(day.booking, e) : undefined}>
                          <div className="font-medium">{day.date}</div>
                          {day.booking && (
                            <div className="text-[6px] mt-1 px-1 leading-tight">
                              <div className="text-white/90">{day.booking.name.split(' ')[0]}</div>
                              <div className="text-white/80">{day.booking.service}</div>
                              <div className="text-white">{day.booking.time}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                
                 {/* Booking Summary */}
                <div className="bg-slate-700/50 rounded-lg p-2 mt-2">
                  <div className="text-slate-300 text-[8px] font-medium mb-1">Today's Bookings</div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[7px]">
                      <span className="text-slate-400">09:00 - John (Personal Training)</span>
                      <span className="text-primary">Confirmed</span>
                    </div>
                    <div className="flex justify-between items-center text-[7px]">
                      <span className="text-slate-400">11:30 - Lisa (Yoga Class)</span>
                      <span className="text-primary">Confirmed</span>
                    </div>
                    <div className="flex justify-between items-center text-[7px]">
                      <span className="text-slate-400">14:00 - Mike (Massage Therapy)</span>
                      <span className="text-primary">Confirmed</span>
                    </div>
                    <div className="flex justify-between items-center text-[7px]">
                      <span className="text-slate-400">16:30 - Sofia (Pilates)</span>
                      <span className="text-primary">Confirmed</span>
                    </div>
                    <div className="flex justify-between items-center text-[7px]">
                      <span className="text-slate-400">18:00 - David (Strength Training)</span>
                      <span className="text-primary">Confirmed</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Week View */
              <div className="space-y-1 flex-1">
                {/* Week Headers */}
                <div className="grid grid-cols-8 gap-1 text-[7px]">
                  <div className="text-slate-400 text-center py-1 font-medium">Time</div>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                    // Get the date for this day in the current month
                    const weekStartDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 7); // Start from 7th
                    const dayDate = weekStartDate.getDate() + index;
                    return (
                      <div key={day} className="text-slate-400 text-center py-1 font-medium border-b border-slate-700/30">
                        {day} {dayDate}
                      </div>
                    );
                  })}
                </div>
                
                {/* Time Slots */}
                <div className="space-y-1">
                  {Array.from({ length: 18 }, (_, i) => {
                    const hour = 6 + i;
                    return hour.toString().padStart(2, '0') + ':00';
                  }).map((time) => (
                    <div key={time} className="grid grid-cols-8 gap-1 text-[7px]">
                      <div className="text-slate-400 text-center py-1 font-medium">{time}</div>
                      {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                        // Calculate the actual date for this day
                        const weekStartDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 7);
                        const dayDate = weekStartDate.getDate() + dayIndex;
                        
                        // Get booking for this date and time
                        const dayBooking = bookings[dayDate as keyof typeof bookings];
                        const booking = dayBooking && dayBooking.time === time ? dayBooking : null;
                        
                        return (
                          <div key={dayIndex} className={`py-1 px-1 rounded text-center transition-colors ${
                            booking 
                              ? 'bg-primary/80 text-white font-medium border border-primary/50 cursor-pointer hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 ease-out' 
                              : 'hover:bg-slate-700/30'
                          }`}
                          onClick={booking ? (e) => handleBookingClick(booking, e) : undefined}>
                            {booking && (
                              <div className="text-[6px] leading-tight">
                                <div className="text-white/90">{booking.name.split(' ')[0]}</div>
                                <div className="text-white/80">{booking.service}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking Popup */}
            {showPopup && selectedBooking && (
              <div 
                data-popup="true"
                className="absolute z-[9999] bg-slate-900/95 border border-slate-600/50 rounded-lg p-3 backdrop-blur-sm shadow-2xl"
                style={{
                  left: `${popupPosition.x}px`,
                  top: `${popupPosition.y}px`,
                  transform: 'translateX(-50%) translateY(-100%)',
                  minWidth: '240px',
                  maxWidth: '280px'
                }}
              >
                {/* Close button */}
                <button
                  onClick={() => setShowPopup(false)}
                  className="absolute top-1 right-1 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
                
                {/* Booking details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedBooking.status === 'confirmed' ? 'bg-primary' : 'bg-yellow-400'
                    }`} />
                    <span className="text-white text-[10px] font-semibold">
                      {selectedBooking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-white text-[11px] font-semibold">{selectedBooking.name}</h4>
                    <p className="text-primary text-[9px] font-medium">{selectedBooking.service}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px]">
                      <span className="text-slate-400">Time:</span>
                      <span className="text-white">{selectedBooking.time} ({selectedBooking.duration})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[8px]">
                      <span className="text-slate-400">Phone:</span>
                      <span className="text-white">{selectedBooking.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[8px]">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-white">{selectedBooking.email}</span>
                    </div>
                  </div>
                  
                  {selectedBooking.notes && (
                    <div className="border-t border-slate-700/50 pt-2">
                      <p className="text-slate-300 text-[8px] leading-relaxed">{selectedBooking.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>,
    className: "lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-3"
  }, {
    Icon: BoltIcon,
    name: "Smart AI Responses",
    description: "See how our AI provides intelligent, contextual responses",
    href: "/features/ai-responses",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          
          {/* Smart AI Comparison Interface */}
          <div className="absolute top-2 left-2 right-2 bottom-2 bg-slate-800/95 rounded-xl border border-slate-700/50 p-3 backdrop-blur-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-white text-[10px] font-semibold">Normal</span>
                <div className="w-4 h-4 bg-emerald-500/30 rounded-full flex items-center justify-center">
                  <span className="text-[8px] text-emerald-400">vs</span>
                </div>
                <span className="text-emerald-400 text-[10px] font-semibold">Smart AI</span>
              </div>
            </div>
            
            {/* Comparison Grid */}
            <div className="flex-1 space-y-2">
              {/* Comparison Row 1 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <X className="w-2 h-2 text-red-400" />
                    <span className="text-red-400 text-[7px] font-medium">Normal</span>
                  </div>
                  <div className="bg-red-500/10 rounded px-2 py-1">
                    <p className="text-red-300 text-[7px] leading-tight">"We are closed"</p>
                  </div>
                </div>
                
                <div className="bg-primary/20 border border-primary/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Check className="w-2 h-2 text-primary" />
                    <span className="text-primary text-[7px] font-medium">Smart AI</span>
                  </div>
                  <div className="bg-primary/10 rounded px-2 py-1">
                    <p className="text-primary text-[7px] leading-tight">"We are closed now, but open tomorrow at 9:00. Shall I schedule an appointment?"</p>
                  </div>
                </div>
              </div>
              
              {/* Comparison Row 2 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <X className="w-2 h-2 text-red-400" />
                    <span className="text-red-400 text-[7px] font-medium">Normal</span>
                  </div>
                  <div className="bg-red-500/10 rounded px-2 py-1">
                    <p className="text-red-300 text-[7px] leading-tight">"Choose a service"</p>
                  </div>
                </div>
                
                <div className="bg-primary/20 border border-primary/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Check className="w-2 h-2 text-primary" />
                    <span className="text-primary text-[7px] font-medium">Smart AI</span>
                  </div>
                  <div className="bg-primary/10 rounded px-2 py-1">
                    <p className="text-primary text-[7px] leading-tight">"Based on your last visit (haircut), I suggest: haircut + wash for €40?"</p>
                  </div>
                </div>
              </div>
              
              {/* Comparison Row 3 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <X className="w-2 h-2 text-red-400" />
                    <span className="text-red-400 text-[7px] font-medium">Normal</span>
                  </div>
                  <div className="bg-red-500/10 rounded px-2 py-1">
                    <p className="text-red-300 text-[7px] leading-tight">"Choose a time"</p>
                  </div>
                </div>
                
                <div className="bg-primary/20 border border-primary/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Check className="w-2 h-2 text-primary" />
                    <span className="text-primary text-[7px] font-medium">Smart AI</span>
                  </div>
                  <div className="bg-primary/10 rounded px-2 py-1">
                    <p className="text-primary text-[7px] leading-tight">"You came last time on Thursday 3:00 PM. Same time this week?"</p>
                  </div>
                </div>
              </div>
              
              {/* Comparison Row 4 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <X className="w-2 h-2 text-red-400" />
                    <span className="text-red-400 text-[7px] font-medium">Normal</span>
                  </div>
                  <div className="bg-red-500/10 rounded px-2 py-1">
                    <p className="text-red-300 text-[7px] leading-tight">"Pay after appointment"</p>
                  </div>
                </div>
                
                <div className="bg-primary/20 border border-primary/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Check className="w-2 h-2 text-primary" />
                    <span className="text-primary text-[7px] font-medium">Smart AI</span>
                  </div>
                  <div className="bg-primary/10 rounded px-2 py-1">
                    <p className="text-primary text-[7px] leading-tight">"Haircut €25, payment by cash or card. Want to confirm directly?"</p>
                  </div>
                </div>
              </div>
              
              {/* Comparison Row 5 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <X className="w-2 h-2 text-red-400" />
                    <span className="text-red-400 text-[7px] font-medium">Normal</span>
                  </div>
                  <div className="bg-red-500/10 rounded px-2 py-1">
                    <p className="text-red-300 text-[7px] leading-tight">"Cancellation not possible"</p>
                  </div>
                </div>
                
                <div className="bg-primary/20 border border-primary/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Check className="w-2 h-2 text-primary" />
                    <span className="text-primary text-[7px] font-medium">Smart AI</span>
                  </div>
                  <div className="bg-primary/10 rounded px-2 py-1">
                    <p className="text-primary text-[7px] leading-tight">"Of course, which appointment would you like to cancel? Shall I suggest a new time right away?"</p>
                  </div>
                </div>
              </div>
              
              {/* Comparison Row 6 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <X className="w-2 h-2 text-red-400" />
                    <span className="text-red-400 text-[7px] font-medium">Normal</span>
                  </div>
                  <div className="bg-red-500/10 rounded px-2 py-1">
                    <p className="text-red-300 text-[7px] leading-tight">"Monday to Friday 9-17h"</p>
                  </div>
                </div>
                
                <div className="bg-primary/20 border border-primary/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Check className="w-2 h-2 text-primary" />
                    <span className="text-primary text-[7px] font-medium">Smart AI</span>
                  </div>
                  <div className="bg-primary/10 rounded px-2 py-1">
                    <p className="text-primary text-[7px] leading-tight">"We are open today until 17:00. Can I still schedule you now or would you prefer tomorrow?"</p>
                  </div>
                </div>
              </div>
              
              {/* Comparison Row 7 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <X className="w-2 h-2 text-red-400" />
                    <span className="text-red-400 text-[7px] font-medium">Normal</span>
                  </div>
                  <div className="bg-red-500/10 rounded px-2 py-1">
                    <p className="text-red-300 text-[7px] leading-tight">"Fill in your details"</p>
                  </div>
                </div>
                
                <div className="bg-primary/20 border border-primary/30 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Check className="w-2 h-2 text-primary" />
                    <span className="text-primary text-[7px] font-medium">Smart AI</span>
                  </div>
                  <div className="bg-primary/10 rounded px-2 py-1">
                    <p className="text-primary text-[7px] leading-tight">"Hello Sarah! Use the same contact details as last time?"</p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>,
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-4"
  }, {
    Icon: BellIcon,
    name: "Automatic Reminders",
    description: "Sends confirmation and reminder messages to reduce no-shows",
    href: "/features/reminders",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          
          {/* Background container for WhatsApp notifications */}
          <div className="absolute top-3 left-3 right-3 bottom-3 bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 backdrop-blur-sm overflow-hidden">
            {/* First WhatsApp Notification */}
            <div className="bg-slate-700/50 rounded-lg shadow-sm border border-slate-600/50 p-3">
              {/* WhatsApp App Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {/* Authentic WhatsApp Logo */}
                  <div className="w-4 h-4 bg-[#25D366] rounded-sm flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.251" fill="currentColor"/>
                    </svg>
                  </div>
                  <span className="text-gray-400 text-xs uppercase font-medium tracking-wide">WhatsApp</span>
                </div>
                <span className="text-gray-500 text-xs">13m ago</span>
              </div>
              
              {/* Sender Name */}
              <div className="mb-1">
                <span className="text-white text-sm font-medium">Wellness Clinic</span>
              </div>
              
              {/* Message Preview */}
              <div className="text-gray-200 text-xs leading-relaxed">
                🔔 Reminder: Your appointment is tomorrow at 2:00 PM.
              </div>
            </div>

          </div>
        </div>,
    className: "lg:row-start-3 lg:row-end-4 lg:col-start-1 lg:col-end-2"
  }, {
    Icon: BarChart3Icon,
    name: "Detailed Analytics",
    description: "Track booking rates, popular times and generated revenue",
    href: "/features/analytics",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          
          {/* Analytics Section */}
          <div className="absolute top-3 left-3 right-3 bottom-3 bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm flex items-start justify-center pt-6">
            {/* Main Analytics Grid - 4 Columns */}
            <div className="grid grid-cols-4 gap-3 w-full">
              {/* Response Time */}
              <div className="bg-primary/20 border border-primary/30 rounded-lg p-3 text-center">
                <div className="text-primary text-[14px] mb-1">⚡</div>
                <div className="text-white text-[16px] font-bold mb-1">2.3m</div>
                <div className="text-primary/80 text-[8px] uppercase tracking-wider">Response</div>
              </div>
              
              {/* Views */}
              <div className="bg-primary/20 border border-primary/30 rounded-lg p-3 text-center">
                <div className="text-primary text-[14px] mb-1">👁</div>
                <div className="text-white text-[16px] font-bold mb-1">1.2k</div>
                <div className="text-primary/80 text-[8px] uppercase tracking-wider">Views</div>
              </div>
              
              {/* Conversion */}
              <div className="bg-primary/20 border border-primary/30 rounded-lg p-3 text-center">
                <div className="text-primary text-[14px] mb-1">📈</div>
                <div className="text-white text-[16px] font-bold mb-1">89%</div>
                <div className="text-primary/80 text-[8px] uppercase tracking-wider">Convert</div>
              </div>
              
              {/* No-shows */}
              <div className="bg-primary/20 border border-primary/30 rounded-lg p-3 text-center">
                <div className="text-primary text-[14px] mb-1">⚠</div>
                <div className="text-white text-[16px] font-bold mb-1">8.5%</div>
                <div className="text-primary/80 text-[8px] uppercase tracking-wider">No-shows</div>
              </div>
            </div>
          </div>
        </div>,
    className: "lg:col-start-3 lg:col-end-4 lg:row-start-3 lg:row-end-4"
  }, {
    Icon: GlobeIcon,
    name: "Multi-language Support",
    description: "Automatically communicates in your customers' preferred language",
    href: "/features/multilingual",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-emerald-700/20" />
          
          {/* Translation Demo Interface */}
          <TranslationDemo />
          
          {/* Globe icon and background accent elements */}
          <div className="absolute bottom-4 left-4 text-emerald-400/30 text-2xl">🌍</div>
          <div className="absolute bottom-4 right-4 w-3 h-3 bg-emerald-500/40 rounded-full" />
        </div>,
    className: "lg:col-start-1 lg:col-end-3 lg:row-start-4 lg:row-end-5"
  }, {
    Icon: MonitorIcon,
    name: "Real-time Dashboard Monitoring",
    description: "View live bookings, performance and customer interactions",
    href: "/features/monitoring",
    cta: "Learn more",
    background: <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-600/30 to-slate-800/20" />
          
          {/* Carousel Container - positioned to leave room for BentoCard footer */}
          <div className="absolute top-2 left-3 right-3 bottom-24">
            <div className="h-full flex flex-col">
              {/* Carousel Content */}
              <div className="flex-1 relative overflow-hidden">
              <div className="flex h-20 gap-3 px-2 mt-4">
                {/* Today Stats - Enhanced */}
                <div className="flex-1">
                  <div className="h-full bg-primary/20 border border-primary/30 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar className="h-3 w-3 text-primary" />
                      <div className="text-white text-lg font-bold">5</div>
                      <div className="text-primary text-[6px] opacity-70">+2</div>
                    </div>
                    <div className="text-primary text-xs font-medium mb-1">Today</div>
                    <div className="w-full bg-primary/30 rounded-full h-1">
                      <div className="bg-primary h-1 rounded-full" style={{width: '60%'}}></div>
                    </div>
                    <div className="text-primary text-[6px] mt-1 opacity-70">€375 revenue</div>
                  </div>
                </div>

                {/* Active Now - Enhanced */}
                <div className="flex-1">
                  <div className="h-full bg-primary/20 border border-primary/30 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="relative">
                        <Users className="h-3 w-3 text-primary" />
                      </div>
                      <div className="text-white text-lg font-bold">3</div>
                      <CheckCircle className="h-2 w-2 text-primary opacity-70" />
                    </div>
                    <div className="text-primary text-xs font-medium mb-1">Active Now</div>
                    <div className="flex gap-1">
                      <div className="w-1 h-2 bg-primary rounded-full"></div>
                      <div className="w-1 h-2 bg-primary/70 rounded-full"></div>
                      <div className="w-1 h-2 bg-primary/50 rounded-full"></div>
                    </div>
                    <div className="text-primary text-[6px] mt-1 opacity-70">2 confirmed</div>
                  </div>
                </div>

                {/* WhatsApp Live - Enhanced */}
                <div className="flex-1">
                  <div className="h-full bg-primary/20 border border-primary/30 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="relative">
                        <MessageCircle className="h-3 w-3 text-primary" />
                      </div>
                      <div className="text-white text-lg font-bold">17</div>
                      <Activity className="h-2 w-2 text-primary opacity-70" />
                    </div>
                    <div className="text-primary text-xs font-medium mb-1">WhatsApp</div>
                    <div className="flex justify-center gap-0.5">
                      <div className="text-primary text-[6px]">12 in</div>
                      <div className="text-primary text-[6px]">•</div>
                      <div className="text-primary text-[6px]">5 out</div>
                    </div>
                    <div className="text-primary text-[6px] opacity-70">2m avg response</div>
                  </div>
                </div>
              </div>
              </div>
            </div>

          </div>
          
          {/* Timestamp positioned in middle area between carousel and BentoCard footer */}
          <div className="absolute bottom-14 left-4 right-4">
            <div className="text-center">
              <span className="text-slate-400 text-[10px]">Last update {new Date().toLocaleTimeString('en-US')}</span>
            </div>
          </div>
        </div>,
    className: "lg:col-start-3 lg:col-end-4 lg:row-start-4 lg:row-end-5"
  }];
  const stats = [{
    value: "24/7",
    label: "Always Working"
  }, {
    value: "∞",
    label: "Unlimited Capacity"
  }, {
    value: "0%",
    label: "Human Errors"
  }];
  return <section className="py-12 md:py-24 px-3 md:px-4 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Background decoration - Optimized for mobile */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header - Mobile optimized */}
        <div className="text-center mb-8 md:mb-20">
          <h2 className="text-xl md:text-5xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
            Everything You Need To{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Automate Bookings
            </span>
          </h2>
          <p className="text-sm md:text-xl text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
            <span className="md:hidden">Features that maximize bookings and revenue</span>
            <span className="hidden md:inline">Powerful features that work seamlessly together to maximize your bookings and revenue</span>
          </p>
        </div>
        
        {/* Bento Grid Features */}
        <div className="mb-12 md:mb-32">
          <BentoGrid>
            {bookingFeatures.map((feature, idx) => <BentoCard key={idx} {...feature} />)}
          </BentoGrid>
        </div>
        
      </div>
    </section>;
};

export default Features;
