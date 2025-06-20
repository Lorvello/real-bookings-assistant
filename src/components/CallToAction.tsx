
import { Button } from "@/components/ui/button";

const CallToAction = () => {
  return (
    <section className="py-16 px-6 bg-secondary">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Automate Today with 1 Click
        </h2>
        <p className="text-lg text-muted-foreground mb-6">
          Stop losing money to missed calls and manual booking chaos. 
          Your AI appointment agent is ready to work 24/7.
        </p>
        
        <div className="bg-background border border-border p-6 rounded-2xl mb-6">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-semibold text-sm text-foreground">Live in 5 Minutes</div>
              <div className="text-xs text-muted-foreground">No technical setup required</div>
            </div>
            <div>
              <div className="text-2xl mb-2">💳</div>
              <div className="font-semibold text-sm text-foreground">No Credit Card</div>
              <div className="text-xs text-muted-foreground">Start free, upgrade when ready</div>
            </div>
            <div>
              <div className="text-2xl mb-2">🎯</div>
              <div className="font-semibold text-sm text-foreground">Guaranteed Results</div>
              <div className="text-xs text-muted-foreground">Or your money back</div>
            </div>
          </div>
          
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 text-lg font-bold rounded-xl shadow-lg">
            Start My Free AI Agent Now
          </Button>
          
          <p className="text-sm mt-3 text-muted-foreground">
            ✅ 7-day free trial • ✅ Cancel anytime • ✅ Setup support included
          </p>
        </div>
        
        <div className="bg-background border border-border p-4 rounded-xl">
          <p className="text-base font-semibold mb-2 text-foreground">
            ⏰ Limited Time: Free Setup Worth $297
          </p>
          <p className="text-muted-foreground text-sm">
            Our setup specialists will configure everything for you. 
            This week only - normally $297, yours free.
          </p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Still have questions? Our team is here to help.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" className="border-border text-foreground hover:bg-background text-sm">
            Book a Demo Call
          </Button>
          <Button variant="outline" className="border-border text-foreground hover:bg-background text-sm">
            View Pricing Plans
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
