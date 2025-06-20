
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Zap, Scissors, Stethoscope, Dumbbell } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-secondary via-background to-background overflow-hidden flex items-center justify-center">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-primary/8 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(55,65,81,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(55,65,81,0.3)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="relative max-w-6xl mx-auto px-6 text-center z-10 py-20">
        {/* Floating badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-5 py-2 mb-6 animate-appear opacity-0">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-primary text-xs font-medium">AI-Powered Booking Revolution</span>
        </div>

        {/* Main headline */}
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight animate-appear opacity-0 delay-100">
            <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent relative">
              Bookings
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/15 to-primary/15 blur-xl -z-10"></div>
            </span>
            {" "}on Auto Pilot
            <br />
            via WhatsApp
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-appear opacity-0 delay-300">
            Your AI assistant books appointments through WhatsApp while you sleep.{" "}
            <span className="text-primary font-medium">24/7 automation</span>,{" "}
            <span className="text-primary font-medium">instant responses</span>,{" "}
            <span className="text-primary font-medium">zero missed opportunities</span>.
          </p>

          {/* CTA Section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-appear opacity-0 delay-500">
            <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground px-6 py-3 text-base font-medium rounded-lg shadow-lg shadow-primary/20 border-0 transition-all duration-300 hover:scale-105 hover:shadow-primary/30 group">
              <MessageCircle className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
              Start Free 7-Day Trial
            </Button>
            
            <button className="text-muted-foreground hover:text-foreground text-base font-medium flex items-center gap-2 group transition-colors">
              <Zap className="w-4 h-4 group-hover:text-primary transition-colors" />
              See how it works
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-6 pt-4 animate-appear opacity-0 delay-700">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                <div className="w-6 h-6 bg-card rounded-full border-2 border-background flex items-center justify-center">
                  <Scissors className="w-3 h-3 text-foreground" />
                </div>
                <div className="w-6 h-6 bg-card rounded-full border-2 border-background flex items-center justify-center">
                  <div className="w-3 h-3 bg-foreground rounded-t-full" style={{
                    clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)"
                  }}></div>
                </div>
                <div className="w-6 h-6 bg-card rounded-full border-2 border-background flex items-center justify-center">
                  <Dumbbell className="w-3 h-3 text-foreground" />
                </div>
                <div className="w-6 h-6 bg-card rounded-full border-2 border-background flex items-center justify-center">
                  <Stethoscope className="w-3 h-3 text-foreground" />
                </div>
              </div>
              <span className="text-muted-foreground text-sm">1000+ businesses automated</span>
            </div>
            
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-primary text-base">★</span>
              ))}
              <span className="text-muted-foreground text-sm ml-1">4.9/5 rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent"></div>
    </section>
  );
};

export default Hero;
