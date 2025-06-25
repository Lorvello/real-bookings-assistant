
const SocialProof = () => {
  const testimonials = [
    {
      quote: "This AI agent has transformed my business. I book 15 more customers per week without lifting a finger.",
      name: "Mike Rodriguez",
      business: "Elite Fitness Studio",
      rating: 5
    },
    {
      quote: "The setup was incredibly simple. Within 5 minutes I was getting automated bookings via WhatsApp.",
      name: "Dr. Amanda Chen",
      business: "Wellness Clinic",
      rating: 5
    },
    {
      quote: "My customers love how fast and easy it is to book. No more phone tag or waiting for callbacks.",
      name: "Jessica Taylor",
      business: "Beauty Spa",
      rating: 5
    }
  ];

  return (
    <section className="py-6 md:py-20 px-3 md:px-4 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-6 md:mb-16">
          <h2 className="text-xl md:text-4xl font-bold text-white mb-2 md:mb-6 px-3 sm:px-0">
            Trusted by <span className="text-emerald-400">1000+ Businesses</span>
          </h2>
          <p className="text-xs md:text-xl text-slate-300 px-3 sm:px-0">Join successful businesses that are already automating their bookings</p>
        </div>
        
        {/* Desktop: Testimonials grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-16">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 md:p-8 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-300 mx-4 sm:mx-0"
            >
              <div className="flex mb-2 md:mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-sm md:text-xl">⭐</span>
                ))}
              </div>
              <p className="text-slate-300 mb-3 md:mb-6 italic text-xs md:text-base">"{testimonial.quote}"</p>
              <div>
                <div className="font-semibold text-white text-xs md:text-base">{testimonial.name}</div>
                <div className="text-xs md:text-sm text-slate-400">{testimonial.business}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: Testimonials carousel */}
        <div className="md:hidden mb-6">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex space-x-4 snap-x snap-mandatory scroll-smooth">
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index} 
                  className="w-[85vw] flex-none snap-start bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-3"
                >
                  <div className="flex mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-sm">⭐</span>
                    ))}
                  </div>
                  <p className="text-slate-300 mb-3 italic text-xs">"{testimonial.quote}"</p>
                  <div>
                    <div className="font-semibold text-white text-xs">{testimonial.name}</div>
                    <div className="text-xs text-slate-400">{testimonial.business}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Testimonials carousel indicators */}
          <div className="flex justify-center space-x-2 mt-3">
            {testimonials.map((_, index) => (
              <div key={index} className="w-2 h-2 bg-slate-600 rounded-full"></div>
            ))}
          </div>
        </div>
        
        {/* Trust badges - Compact mobile */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-3 md:p-8 text-center mx-3 sm:mx-0">
          <div className="flex justify-center items-center gap-2 md:gap-4 mb-2 md:mb-4">
            <span className="text-lg md:text-3xl">🔒</span>
            <span className="text-lg md:text-3xl">✅</span>
            <span className="text-lg md:text-3xl">🛡️</span>
          </div>
          <h3 className="text-sm md:text-xl font-semibold text-white mb-1 md:mb-2">
            Enterprise-Grade Security & Compliance
          </h3>
          <p className="text-slate-300 text-xs md:text-base">
            GDPR compliant • End-to-end encryption • SOC 2 certified • 99.9% uptime guarantee
          </p>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
