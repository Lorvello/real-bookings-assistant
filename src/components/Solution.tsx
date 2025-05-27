
import { Button } from "@/components/ui/button";

const Solution = () => {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Meet Your <span className="text-green-600">24/7 AI Appointment Agent</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            The smart WhatsApp assistant that books qualified appointments while you focus on what you do best
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full mb-4 w-fit">
              💡 THE SOLUTION
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-6">
              Automate Bookings Through WhatsApp
            </h3>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✅</span>
                <div>
                  <strong>Always Available:</strong> Books appointments 24/7, even during your sessions
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✅</span>
                <div>
                  <strong>Smart Qualification:</strong> Asks the right questions to pre-qualify leads
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✅</span>
                <div>
                  <strong>Zero Conflicts:</strong> Syncs with your calendar to prevent double bookings
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✅</span>
                <div>
                  <strong>Instant Setup:</strong> Live in 5 minutes with zero technical knowledge required
                </div>
              </li>
            </ul>
            
            <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 font-semibold rounded-xl">
              Start Your Free Trial Now
            </Button>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-2xl">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">AI</span>
                </div>
                <div>
                  <div className="font-semibold">AI Agent</div>
                  <div className="text-sm text-green-500">●Online</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-sm"><strong>Client:</strong> Hi, I'd like to book a session</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <p className="text-sm"><strong>AI Agent:</strong> Great! I can help you book immediately. What type of session are you looking for?</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-sm"><strong>Client:</strong> 60-minute massage therapy</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <p className="text-sm"><strong>AI Agent:</strong> Perfect! I have availability tomorrow at 2 PM or Thursday at 10 AM. Which works better?</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solution;
