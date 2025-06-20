
const SocialProof = () => {
  const testimonials = [
    {
      quote: "This AI agent has transformed my business. I book 15 more clients per week without lifting a finger.",
      name: "Mike Rodriguez",
      business: "Elite Fitness Studio",
      rating: 5
    },
    {
      quote: "The setup was incredibly easy. Within 5 minutes, I was getting automated bookings through WhatsApp.",
      name: "Dr. Amanda Chen",
      business: "Wellness Clinic",
      rating: 5
    },
    {
      quote: "My clients love how quick and easy it is to book. No more phone tag or waiting for callbacks.",
      name: "Jessica Taylor",
      business: "Beauty Spa",
      rating: 5
    }
  ];

  return (
    <section className="py-section px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Trusted by <span className="text-primary">1000+ Businesses</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join successful businesses already automating their bookings
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-secondary border border-border p-6 rounded-xl">
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-primary text-lg">⭐</span>
                ))}
              </div>
              <p className="text-foreground mb-6 italic leading-relaxed">"{testimonial.quote}"</p>
              <div>
                <div className="font-semibold text-primary">{testimonial.name}</div>
                <div className="text-sm text-muted-foreground">{testimonial.business}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-secondary border border-border p-6 rounded-xl text-center">
          <div className="flex justify-center items-center gap-4 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold">🔒</span>
            </div>
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold">✅</span>
            </div>
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold">🛡️</span>
            </div>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Enterprise-Grade Security & Compliance
          </h3>
          <p className="text-muted-foreground">
            GDPR compliant • End-to-end encryption • SOC 2 certified • 99.9% uptime guarantee
          </p>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
