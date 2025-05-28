
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
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Trusted by <span className="text-green-600">1000+ Businesses</span>
          </h2>
          <p className="text-xl text-gray-600">Join successful businesses already automating their bookings</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gray-50 p-8 rounded-2xl">
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">⭐</span>
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
              <div>
                <div className="font-semibold text-gray-900">{testimonial.name}</div>
                <div className="text-sm text-gray-600">{testimonial.business}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-green-50 p-8 rounded-2xl text-center">
          <div className="flex justify-center items-center gap-4 mb-4">
            <span className="text-3xl">🔒</span>
            <span className="text-3xl">✅</span>
            <span className="text-3xl">🛡️</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Enterprise-Grade Security & Compliance
          </h3>
          <p className="text-gray-600">
            GDPR compliant • End-to-end encryption • SOC 2 certified • 99.9% uptime guarantee
          </p>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
