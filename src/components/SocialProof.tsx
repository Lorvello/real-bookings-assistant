
import { Star, Quote, MapPin, Calendar, Clock, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const SocialProof = () => {
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);
  const [activeStatsIndex, setActiveStatsIndex] = useState(0);
  const testimonialsCarouselRef = useRef<HTMLDivElement>(null);
  const statsCarouselRef = useRef<HTMLDivElement>(null);

  const testimonials = [
    {
      name: "Maria Santos",
      business: "Salon Belleza",
      location: "Barcelona",
      rating: 5,
      image: "/placeholder.svg",
      testimonial: "Since using the AI booking system, I save 3 hours every day! No more back-and-forth messages. My customers love how fast they get responses, and I've increased my bookings by 40%.",
      stats: "40% more bookings",
      service: "Hair Salon"
    },
    {
      name: "Dr. Thomas Mueller",
      business: "Wellness Clinic",
      location: "Munich",
      rating: 5,
      image: "/placeholder.svg",
      testimonial: "The AI perfectly handles all appointment requests, even complex scheduling. My patients are amazed by the instant responses. It's like having a perfect receptionist 24/7.",
      stats: "24/7 availability",
      service: "Medical Practice"
    },
    {
      name: "Sophie Laurent",
      business: "Fitness Studio",
      location: "Paris",
      rating: 5,
      image: "/placeholder.svg",
      testimonial: "My members can now book classes instantly via WhatsApp. The AI knows all our class schedules and handles cancellations perfectly. Revenue increased by 35% in just 2 months!",
      stats: "35% revenue increase",
      service: "Fitness Studio"
    }
  ];

  const stats = [
    { value: "10,000+", label: "Happy Businesses", icon: User },
    { value: "500k+", label: "Bookings Processed", icon: Calendar },
    { value: "3 sec", label: "Average Response", icon: Clock }
  ];

  // Handle testimonials carousel scroll
  useEffect(() => {
    const carousel = testimonialsCarouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const itemWidth = carousel.children[0]?.clientWidth || 0;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setActiveTestimonialIndex(newIndex);
    };

    carousel.addEventListener('scroll', handleScroll, { passive: true });
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle stats carousel scroll
  useEffect(() => {
    const carousel = statsCarouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const itemWidth = carousel.children[0]?.clientWidth || 0;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setActiveStatsIndex(newIndex);
    };

    carousel.addEventListener('scroll', handleScroll, { passive: true });
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle carousel indicator clicks
  const handleTestimonialIndicatorClick = (index: number) => {
    const carousel = testimonialsCarouselRef.current;
    if (!carousel) return;
    
    const itemWidth = carousel.children[0]?.clientWidth || 0;
    carousel.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth'
    });
  };

  const handleStatsIndicatorClick = (index: number) => {
    const carousel = statsCarouselRef.current;
    if (!carousel) return;
    
    const itemWidth = carousel.children[0]?.clientWidth || 0;
    carousel.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth'
    });
  };

  return (
    <section className="py-12 md:py-24 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-6xl mx-auto relative z-10 px-6 md:px-8 lg:px-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-20">
          <h2 className="text-xl md:text-5xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
            Trusted by <span className="text-emerald-400">10,000+</span> Businesses
          </h2>
          <p className="text-sm md:text-xl text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
            <span className="md:hidden">Thousands trust our booking automation</span>
            <span className="hidden md:inline">Join thousands of business owners who've revolutionized their booking process</span>
          </p>
        </div>

        {/* Desktop: Stats grid */}
        <div className="hidden md:flex justify-center gap-8 md:gap-16 mb-12 md:mb-20">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center group hover:transform hover:scale-105 transition-all duration-300">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div className="text-2xl md:text-4xl font-bold text-emerald-400 mb-2 group-hover:text-emerald-300 transition-colors">
                  {stat.value}
                </div>
                <div className="text-slate-400 text-sm md:text-base group-hover:text-slate-300 transition-colors">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile: Stats grid (replaced carousel) */}
        <div className="md:hidden mb-8">
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center bg-slate-800/30 rounded-xl p-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center mb-3 mx-auto shadow-lg">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-lg font-bold text-emerald-400 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-slate-400 text-xs">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop: Testimonials grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 md:p-8 hover:transform hover:scale-105 transition-all duration-300 cursor-pointer">
              <div className="flex items-center mb-4 md:mb-6">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name}
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full mr-4 object-cover"
                />
                <div className="flex-1">
                  <h4 className="text-white font-semibold text-sm md:text-base">{testimonial.name}</h4>
                  <p className="text-slate-400 text-xs md:text-sm">{testimonial.business}</p>
                  <div className="flex items-center mt-1">
                    <MapPin className="w-3 h-3 text-slate-500 mr-1" />
                    <span className="text-slate-500 text-xs">{testimonial.location}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center mb-3 md:mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
                <span className="ml-2 text-emerald-400 font-semibold text-xs md:text-sm">
                  {testimonial.stats}
                </span>
              </div>
              
              <div className="relative">
                <Quote className="absolute -top-2 -left-2 w-6 h-6 text-emerald-400/30" />
                <p className="text-slate-300 text-xs md:text-sm leading-relaxed pl-4">
                  {testimonial.testimonial}
                </p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <span className="text-emerald-400 text-xs font-medium">
                  {testimonial.service}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: Testimonials carousel */}
        <div className="md:hidden">
          <div 
            ref={testimonialsCarouselRef}
            className="overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain perfect-snap-carousel"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="flex pb-4">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="w-[calc(100vw-2rem)] flex-none snap-start snap-always mx-4">
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 h-full">
                    <div className="flex items-center mb-4">
                      <img 
                        src={testimonial.image} 
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full mr-4 object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="text-white font-semibold text-sm">{testimonial.name}</h4>
                        <p className="text-slate-400 text-xs">{testimonial.business}</p>
                        <div className="flex items-center mt-1">
                          <MapPin className="w-3 h-3 text-slate-500 mr-1" />
                          <span className="text-slate-500 text-xs">{testimonial.location}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                      <span className="ml-2 text-emerald-400 font-semibold text-xs">
                        {testimonial.stats}
                      </span>
                    </div>
                    
                    <div className="relative">
                      <Quote className="absolute -top-2 -left-2 w-6 h-6 text-emerald-400/30" />
                      <p className="text-slate-300 text-xs leading-relaxed pl-4">
                        {testimonial.testimonial}
                      </p>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <span className="text-emerald-400 text-xs font-medium">
                        {testimonial.service}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Testimonials indicators */}
          <div className="flex justify-center space-x-2 mt-4">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => handleTestimonialIndicatorClick(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === activeTestimonialIndex
                    ? 'bg-emerald-400 w-4'
                    : 'bg-slate-600 hover:bg-slate-500'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
