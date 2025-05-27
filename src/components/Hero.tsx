
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="bg-gradient-to-br from-green-50 to-white py-20 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <div className="mb-8">
          <span className="inline-block bg-red-100 text-red-800 text-sm font-semibold px-3 py-1 rounded-full mb-4">
            🚨 STOP Losing Customers
          </span>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Never Double-Book Again.<br />
            <span className="text-green-600">Never Lose Leads Again.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Your AI Appointment Agent works 24/7 via WhatsApp, automatically books qualified clients, 
            and syncs with your calendar. Set up in 5 minutes, no tech skills needed.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-12">
          <div className="bg-white p-6 rounded-2xl shadow-lg max-w-sm">
            <div className="bg-green-500 text-white p-3 rounded-xl mb-4 w-fit">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">WhatsApp Integration</h3>
            <p className="text-gray-600 text-sm">Clients book directly through WhatsApp - the platform they already use daily</p>
          </div>
          
          <div className="text-4xl text-green-500">→</div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg max-w-sm">
            <div className="bg-blue-500 text-white p-3 rounded-xl mb-4 w-fit">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Qualification</h3>
            <p className="text-gray-600 text-sm">Smart questions filter quality leads and gather all booking details automatically</p>
          </div>
        </div>

        <div className="space-y-4">
          <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg font-semibold rounded-xl">
            Start Free — No Hassle Setup
          </Button>
          <p className="text-sm text-gray-500">✅ Live in 5 minutes • ✅ No credit card required • ✅ Cancel anytime</p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
