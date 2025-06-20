
import { Button } from "@/components/ui/button";
import { MessageCircle, Brain, Target, Clock, Users, TrendingUp } from "lucide-react";

const Solution = () => {
  return (
    <section className="py-section px-6 bg-secondary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-primary text-xs font-medium">The Solution</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
            Meet Your <span className="text-primary">24/7</span><br />
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Booking Assistant
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The AI that never sleeps, never misses a lead, and books appointments 
            faster than any human ever could.
          </p>
        </div>
        
        {/* Main features grid */}
        <div className="grid-responsive-3 mb-16">
          {/* Feature 1 */}
          <div className="card-default group hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1">
            <div className="w-12 h-12 bg-primary/10 rounded-card flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <MessageCircle className="w-6 h-6 text-primary" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-3">
              Instant WhatsApp Replies
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
              Responds to every message within seconds, 24/7. Your customers get immediate answers 
              to their questions and available booking slots.
            </p>
            <div className="flex items-center text-primary font-medium text-sm">
              <Clock className="w-4 h-4 mr-2" strokeWidth={2} />
              <span>Average response: 3 seconds</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="card-default group hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1">
            <div className="w-12 h-12 bg-primary/10 rounded-card flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Brain className="w-6 h-6 text-primary" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-3">
              Smart Conversation Flow
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
              Understands context, asks the right questions, and guides customers 
              to the perfect appointment time that works for everyone.
            </p>
            <div className="flex items-center text-primary font-medium text-sm">
              <Users className="w-4 h-4 mr-2" strokeWidth={2} />
              <span>98% customer satisfaction</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="card-default group hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1">
            <div className="w-12 h-12 bg-primary/10 rounded-card flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Target className="w-6 h-6 text-primary" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-3">
              Perfect for Any Business
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
              Salons, clinics, fitness studios, consultants - if you book appointments, 
              our AI adapts to your specific business needs and terminology.
            </p>
            <div className="flex items-center text-primary font-medium text-sm">
              <TrendingUp className="w-4 h-4 mr-2" strokeWidth={2} />
              <span>300% booking increase avg.</span>
            </div>
          </div>
        </div>

        {/* Stats section */}
        <div className="card-default text-center">
          <h3 className="text-2xl font-bold text-foreground mb-6">
            The Numbers Don't Lie
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground text-sm">Always Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">3s</div>
              <div className="text-muted-foreground text-sm">Average Response</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">300%</div>
              <div className="text-muted-foreground text-sm">More Bookings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">0%</div>
              <div className="text-muted-foreground text-sm">Human Error</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solution;
