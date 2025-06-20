
import { Button } from "@/components/ui/button";
import { MessageCircle, Brain, Target, Clock, Users, TrendingUp } from "lucide-react";

const Solution = () => {
  return (
    <section className="py-24 px-4 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-primary text-sm font-medium">The Solution</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Meet Your <span className="text-primary">24/7</span><br />
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Booking Assistant
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            The AI that never sleeps, never misses a lead, and books appointments 
            faster than any human ever could.
          </p>
        </div>
        
        {/* Main features grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {/* Feature 1 */}
          <div className="group bg-card border border-border rounded-3xl p-8 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <MessageCircle className="w-8 h-8 text-primary-foreground" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-card-foreground mb-4">
              Instant WhatsApp Replies
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Responds to every message within seconds, 24/7. Your customers get immediate answers 
              to their questions and available booking slots.
            </p>
            <div className="flex items-center text-primary font-semibold">
              <Clock className="w-5 h-5 mr-2" />
              <span>Average response: 3 seconds</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="group bg-card border border-border rounded-3xl p-8 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Brain className="w-8 h-8 text-primary-foreground" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-card-foreground mb-4">
              Smart Conversation Flow
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Understands context, asks the right questions, and guides customers 
              to the perfect appointment time that works for everyone.
            </p>
            <div className="flex items-center text-primary font-semibold">
              <Users className="w-5 h-5 mr-2" />
              <span>98% customer satisfaction</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="group bg-card border border-border rounded-3xl p-8 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Target className="w-8 h-8 text-primary-foreground" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-card-foreground mb-4">
              Perfect for Any Business
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Salons, clinics, fitness studios, consultants - if you book appointments, 
              our AI adapts to your specific business needs and terminology.
            </p>
            <div className="flex items-center text-primary font-semibold">
              <TrendingUp className="w-5 h-5 mr-2" />
              <span>300% booking increase avg.</span>
            </div>
          </div>
        </div>

        {/* Stats section */}
        <div className="bg-secondary rounded-3xl p-12 text-center border border-border">
          <h3 className="text-3xl font-bold text-foreground mb-8">
            The Numbers Don't Lie
          </h3>
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Always Available</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">3s</div>
              <div className="text-muted-foreground">Average Response</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">300%</div>
              <div className="text-muted-foreground">More Bookings</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">0%</div>
              <div className="text-muted-foreground">Human Error</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solution;
