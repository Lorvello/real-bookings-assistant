
import { Button } from "@/components/ui/button";

const CallToAction = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white relative overflow-hidden">
      {/* Hero-style background elements - CTA variation */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-green-500/8 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-emerald-400/4 rounded-full blur-3xl"></div>
      </div>
      
      {/* Hero-style grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.15)_1px,transparent_1px)] md:bg-[linear-gradient(rgba(15,23,42,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.3)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-25"></div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
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
