
import { Button } from "@/components/ui/button";

const CallToAction = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-green-600 to-blue-600 text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-5xl font-bold mb-6">
          Automate Today with 1 Click
        </h2>
        <p className="text-xl mb-8 opacity-90">
          Stop losing money to missed calls and manual booking chaos. 
          Your AI appointment agent is ready to work 24/7.
        </p>
        
        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl mb-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div>
              <div className="text-3xl mb-2">⚡</div>
              <div className="font-semibold">Live in 5 Minutes</div>
              <div className="text-sm opacity-80">No technical setup required</div>
            </div>
            <div>
              <div className="text-3xl mb-2">💳</div>
              <div className="font-semibold">No Credit Card</div>
              <div className="text-sm opacity-80">Start free, upgrade when ready</div>
            </div>
            <div>
              <div className="text-3xl mb-2">🎯</div>
              <div className="font-semibold">Guaranteed Results</div>
              <div className="text-sm opacity-80">Or your money back</div>
            </div>
          </div>
          
          <Button className="bg-white text-green-600 hover:bg-gray-100 px-8 py-6 text-xl font-bold rounded-xl">
            Start My Free AI Agent Now
          </Button>
          
          <p className="text-sm mt-4 opacity-80">
            ✅ 7-day free trial • ✅ Cancel anytime • ✅ Setup support included
          </p>
        </div>
        
        <div className="bg-red-500/20 border border-red-300 p-6 rounded-xl">
          <p className="text-lg font-semibold mb-2">
            ⏰ Limited Time: Free Setup Worth $297
          </p>
          <p className="opacity-90">
            Our setup specialists will configure everything for you. 
            This week only - normally $297, yours free.
          </p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <p className="text-sm opacity-80 mb-4">
          Still have questions? Our team is here to help.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" className="border-white text-white hover:bg-white hover:text-green-600">
            Book a Demo Call
          </Button>
          <Button variant="outline" className="border-white text-white hover:bg-white hover:text-green-600">
            View Pricing Plans
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
