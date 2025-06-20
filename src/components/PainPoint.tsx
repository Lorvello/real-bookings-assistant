
import { Phone, Calendar, Clock } from "lucide-react";

const PainPoint = () => {
  return (
    <section className="py-24 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-full px-4 py-2 mb-6">
            <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
            <span className="text-destructive text-sm font-medium">The Problem</span>
          </div>
          
          <h2 className="text-4xl font-bold text-foreground mb-6 leading-tight md:text-6xl">
            <span className="text-destructive">80%</span> of Customers Drop Off
            <br />
            Due to <span className="bg-gradient-to-r from-destructive to-destructive/80 bg-clip-text text-transparent">Poor Availability</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            When customers can't reach you instantly, they move on to your competitors. 
            Every missed opportunity is revenue walking out the door.
          </p>
        </div>
        
        {/* Pain points grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="group bg-card backdrop-blur-sm border border-border rounded-3xl p-8 hover:shadow-xl hover:shadow-destructive/10 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-destructive to-destructive/80 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Phone className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-card-foreground mb-4">
              Missed Calls = Lost Revenue
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Every unanswered call is money walking out the door. Your competitors are just one click away.
            </p>
          </div>
          
          <div className="group bg-card backdrop-blur-sm border border-border rounded-3xl p-8 hover:shadow-xl hover:shadow-destructive/10 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-warning to-destructive rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-card-foreground mb-4">
              Double Bookings Kill Trust
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Manual scheduling leads to embarrassing conflicts that damage your reputation and lose clients forever.
            </p>
          </div>
          
          <div className="group bg-card backdrop-blur-sm border border-border rounded-3xl p-8 hover:shadow-xl hover:shadow-destructive/10 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-destructive to-destructive/60 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-card-foreground mb-4">
              After-Hours = Zero Bookings
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              While you sleep, your competitors capture leads. Night time inquiries become morning disappointments.
            </p>
          </div>
        </div>
        
        {/* Testimonial */}
        <div className="bg-gradient-to-r from-destructive via-destructive to-destructive/80 rounded-3xl p-8 text-center text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="text-4xl mb-4 opacity-20">
              "
            </div>
            <p className="text-lg md:text-xl font-medium mb-4 max-w-3xl mx-auto leading-relaxed">
              "I was losing 3-4 bookings every week just because I couldn't answer my phone during sessions. 
              It was costing me thousands in revenue."
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">Sarah</div>
                <div className="text-white/70 text-sm">Wellness Coach</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PainPoint;
