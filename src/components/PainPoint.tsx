import { Phone, Calendar, Clock } from "lucide-react";
const PainPoint = () => {
  return <section className="py-24 px-4 bg-gradient-to-br from-red-50 via-rose-50 to-pink-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-red-100 border border-red-200 rounded-full px-4 py-2 mb-6">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-700 text-sm font-medium">The Problem</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            <span className="text-red-600">80%</span> of Customers Drop Off
            <br />
            Due to <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">Poor Availability</span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            When customers can't reach you instantly, they move on to your competitors. 
            Every missed opportunity is revenue walking out the door.
          </p>
        </div>
        
        {/* Pain points grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="group bg-white/80 backdrop-blur-sm border border-red-100 rounded-3xl p-8 hover:shadow-xl hover:shadow-red-100 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Phone className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Missed Calls = Lost Revenue
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Every unanswered call is money walking out the door. Your competitors are just one click away.
            </p>
          </div>
          
          <div className="group bg-white/80 backdrop-blur-sm border border-red-100 rounded-3xl p-8 hover:shadow-xl hover:shadow-red-100 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Double Bookings Kill Trust
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Manual scheduling leads to embarrassing conflicts that damage your reputation and lose clients forever.
            </p>
          </div>
          
          <div className="group bg-white/80 backdrop-blur-sm border border-red-100 rounded-3xl p-8 hover:shadow-xl hover:shadow-red-100 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              After-Hours = Zero Bookings
            </h3>
            <p className="text-gray-600 leading-relaxed">
              While you sleep, your competitors capture leads. Night time inquiries become morning disappointments.
            </p>
          </div>
        </div>
        
        {/* Testimonial */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 rounded-3xl p-8 text-center text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="text-4xl mb-4 opacity-20">
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
                <div className="text-red-100 text-sm">Wellness Coach</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default PainPoint;