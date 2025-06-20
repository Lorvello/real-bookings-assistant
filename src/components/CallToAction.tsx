
import { Button } from "@/components/ui/button";

const CallToAction = () => {
  return (
    <section className="py-section px-6 bg-background">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Automate Today with 1 Click
        </h2>
        <p className="text-lg text-muted-foreground mb-6">
          Stop losing money to missed calls and manual booking chaos. 
          Your AI appointment agent is ready to work 24/7.
        </p>
        
        <div className="card-default mb-6">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-2 mx-auto">
                <span className="text-primary">⚡</span>
              </div>
              <div className="font-semibold text-sm text-foreground">Live in 5 Minutes</div>
              <div className="text-xs text-muted-foreground">No technical setup required</div>
            </div>
            <div>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-2 mx-auto">
                <span className="text-primary">💳</span>
              </div>
              <div className="font-semibold text-sm text-foreground">No Credit Card</div>
              <div className="text-xs text-muted-foreground">Start free, upgrade when ready</div>
            </div>
            <div>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-2 mx-auto">
                <span className="text-primary">🎯</span>
              </div>
              <div className="font-semibold text-sm text-foreground">Guaranteed Results</div>
              <div className="text-xs text-muted-foreground">Or your money back</div>
            </div>
          </div>
          
          <Button className="px-8 py-4 text-lg font-bold rounded-card shadow-card">
            Start My Free AI Agent Now
          </Button>
          
          <p className="text-sm mt-3 text-muted-foreground">
            ✅ 7-day free trial • ✅ Cancel anytime • ✅ Setup support included
          </p>
        </div>
        
        <div className="card-default">
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
          <Button variant="secondary" className="text-sm">
            Book a Demo Call
          </Button>
          <Button variant="secondary" className="text-sm">
            View Pricing Plans
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
