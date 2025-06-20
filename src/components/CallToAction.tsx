
import { Button } from "@/components/ui/button";

const CallToAction = () => {
  return (
    <section className="py-16 px-6 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Automate Today with 1 Click
        </h2>
        <p className="text-lg mb-6 opacity-90">
          Stop losing money to missed calls and manual booking chaos. 
          Your AI appointment agent is ready to work 24/7.
        </p>
        
        <div className="bg-background/10 backdrop-blur-sm p-6 rounded-2xl mb-6 border border-primary-foreground/10">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-semibold text-sm">Live in 5 Minutes</div>
              <div className="text-xs opacity-80">No technical setup required</div>
            </div>
            <div>
              <div className="text-2xl mb-2">💳</div>
              <div className="font-semibold text-sm">No Credit Card</div>
              <div className="text-xs opacity-80">Start free, upgrade when ready</div>
            </div>
            <div>
              <div className="text-2xl mb-2">🎯</div>
              <div className="font-semibold text-sm">Guaranteed Results</div>
              <div className="text-xs opacity-80">Or your money back</div>
            </div>
          </div>
          
          <Button className="bg-background text-primary hover:bg-background/90 px-6 py-3 text-lg font-bold rounded-xl shadow-lg">
            Start My Free AI Agent Now
          </Button>
          
          <p className="text-sm mt-3 opacity-80">
            ✅ 7-day free trial • ✅ Cancel anytime • ✅ Setup support included
          </p>
        </div>
        
        <div className="bg-destructive/20 border border-destructive/30 p-4 rounded-xl">
          <p className="text-base font-semibold mb-2">
            ⏰ Limited Time: Free Setup Worth $297
          </p>
          <p className="opacity-90 text-sm">
            Our setup specialists will configure everything for you. 
            This week only - normally $297, yours free.
          </p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <p className="text-sm opacity-80 mb-3">
          Still have questions? Our team is here to help.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary text-sm">
            Book a Demo Call
          </Button>
          <Button variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary text-sm">
            View Pricing Plans
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
