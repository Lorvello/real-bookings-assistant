
const Results = () => {
  const stats = [
    { number: "+40%", label: "More Bookings" },
    { number: "0", label: "Missed Appointments" },
    { number: "3min", label: "Average Booking Time" },
    { number: "24/7", label: "Availability" }
  ];

  const caseStudies = [
    {
      industry: "Hair Salon",
      name: "Premium Cuts",
      result: "+65% bookings in first month",
      quote: "I went from 20 to 33 clients per week. The AI never sleeps, never forgets, never double-books."
    },
    {
      industry: "Life Coach",
      name: "Sarah Miller Coaching",
      result: "+45% revenue increase",
      quote: "My clients love booking through WhatsApp. It's so natural and instant."
    },
    {
      industry: "Medical Practice",
      name: "City Wellness Clinic",
      result: "Eliminated waiting lists",
      quote: "Zero no-shows since implementing automated reminders. Game changer."
    }
  ];

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Real Results from <span className="text-green-600">Real Businesses</span>
          </h2>
          <p className="text-xl text-gray-600">See the impact on revenue and efficiency</p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl text-center shadow-sm">
              <div className="text-4xl font-bold text-green-600 mb-2">{stat.number}</div>
              <div className="text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {caseStudies.map((study, index) => (
            <div key={index} className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full mb-4 w-fit">
                {study.industry}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{study.name}</h3>
              <div className="text-2xl font-bold text-green-600 mb-4">{study.result}</div>
              <p className="text-gray-600 italic">"{study.quote}"</p>
            </div>
          ))}
        </div>
        
        <div className="mt-16 bg-red-50 border-l-4 border-red-500 p-8 rounded-r-2xl">
          <h3 className="text-2xl font-semibold text-red-800 mb-4">
            ⚠️ Don't Let Your Competition Get Ahead
          </h3>
          <p className="text-lg text-red-700">
            Every day you wait is another day your competitors are booking the clients you're missing. 
            The businesses using AI appointment agents are already seeing 40%+ more bookings.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Results;
