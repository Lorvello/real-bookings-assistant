
import { Check, Calendar, Globe, BarChart3, Bell, Settings, Zap } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Zap,
      title: "100% Automatic Bookings",
      description: "No manual intervention needed. Books, confirms, and reschedules automatically",
      color: "from-primary to-primary/80"
    },
    {
      icon: Settings,
      title: "Fully Personalized",
      description: "Tailor the AI Agent to your services, FAQs, and booking logic — from custom haircut types to business-specific questions",
      color: "from-primary to-primary/60"
    },
    {
      icon: Calendar,
      title: "Calendar Sync",
      description: "Integrates with Google Calendar, Outlook, Calendly, and more",
      color: "from-primary to-primary/80"
    },
    {
      icon: Bell,
      title: "Automated Reminders",
      description: "Sends confirmation and reminder messages to reduce no-shows",
      color: "from-primary to-primary/60"
    },
    {
      icon: BarChart3,
      title: "Detailed Analytics",
      description: "Track booking rates, popular times, and revenue generated",
      color: "from-primary to-primary/80"
    },
    {
      icon: Globe,
      title: "Multi-Language Support",
      description: "Communicates in your customers' preferred language automatically",
      color: "from-primary to-primary/60"
    }
  ];

  return (
    <section className="py-24 px-4 bg-secondary">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Automate Bookings
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Powerful features that work together seamlessly to maximize your bookings and revenue
          </p>
        </div>
        
        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div key={index} className="group bg-card p-8 rounded-3xl border border-border hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1">
              <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-card-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
        
        {/* CTA Section */}
        <div className="bg-gradient-to-br from-primary via-primary to-primary/80 rounded-3xl p-12 text-center text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <h3 className="text-3xl md:text-4xl font-bold mb-6">
              Don't Let Revenue Sleep While You Do
            </h3>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              While you're busy with clients, your AI agent is busy booking new ones. 
              Start your free trial and see the difference automation makes.
            </p>
            
            <div className="flex flex-wrap justify-center gap-12">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">24/7</div>
                <div className="text-white/80 text-sm uppercase tracking-wider">Always Working</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">∞</div>
                <div className="text-white/80 text-sm uppercase tracking-wider">Unlimited Capacity</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">0%</div>
                <div className="text-white/80 text-sm uppercase tracking-wider">Human Error</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
