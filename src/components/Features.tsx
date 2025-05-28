
const Features = () => {
  const features = [
    {
      icon: "📅",
      title: "100% Automatic Bookings",
      description: "No manual intervention needed. Books, confirms, and reschedules automatically"
    },
    {
      icon: "🧠",
      title: "Fully Personalized for Your Business",
      description: "Tailor the AI Agent to your services, FAQs, and booking logic — from custom haircut types to business-specific questions"
    },
    {
      icon: "🔄",
      title: "Calendar Sync",
      description: "Integrates with Google Calendar, Outlook, Calendly, and more"
    },
    {
      icon: "🔔",
      title: "Automated Reminders",
      description: "Sends confirmation and reminder messages to reduce no-shows"
    },
    {
      icon: "📊",
      title: "Detailed Analytics",
      description: "Track booking rates, popular times, and revenue generated"
    },
    {
      icon: "🌍",
      title: "Multi-Language Support",
      description: "Communicates in your customers' preferred language automatically"
    }
  ];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Everything You Need to <span className="text-green-600">Automate Bookings</span>
          </h2>
          <p className="text-xl text-gray-600">Powerful features that work together to maximize your bookings</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-16 bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-2xl">
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Don't Let Your Revenue Sleep
            </h3>
            <p className="text-xl text-gray-600 mb-6">
              While you're busy with clients, your AI agent is busy booking new ones
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="text-2xl font-bold text-green-600">24/7</div>
                <div className="text-sm text-gray-600">Always Working</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="text-2xl font-bold text-blue-600">0%</div>
                <div className="text-sm text-gray-600">Human Error</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="text-2xl font-bold text-purple-600">∞</div>
                <div className="text-sm text-gray-600">Capacity</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
