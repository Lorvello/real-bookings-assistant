import { Phone, Calendar, Clock } from "lucide-react";

const PainPoint = () => {
  return (
    <section className="pb-20 px-4 bg-red-50">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-8">
          <span className="text-red-600">80%</span> of Your Customers Drop Off Due to Poor Availability
        </h2>
        
        <div className="max-w-5xl mx-auto mb-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 min-h-[320px]">
              <div className="flex flex-col items-center text-center space-y-4 h-full">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <Phone className="w-8 h-8 text-red-600" strokeWidth={2} />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Missed Calls = Lost Revenue</h3>
                  <p className="text-gray-600 leading-relaxed">Every unanswered call is money walking out the door</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 min-h-[320px]">
              <div className="flex flex-col items-center text-center space-y-4 h-full">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-red-600" strokeWidth={2} />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Double Bookings Kill Trust</h3>
                  <p className="text-gray-600 leading-relaxed">Manual scheduling leads to embarrassing conflicts and angry clients</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 min-h-[320px]">
              <div className="flex flex-col items-center text-center space-y-4 h-full">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8 text-red-600" strokeWidth={2} />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">After-Hours = Zero Bookings</h3>
                  <p className="text-gray-600 leading-relaxed">Your competitors are capturing leads while you sleep</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-red-100 border-l-4 border-red-500 p-6 rounded-r-xl">
          <p className="text-lg font-semibold text-red-800">
            "I was losing 3-4 bookings every week just because I couldn't answer my phone during sessions. 
            It was costing me thousands in revenue." - Sarah, Wellness Coach
          </p>
        </div>
      </div>
    </section>
  );
};

export default PainPoint;
