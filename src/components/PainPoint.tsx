
const PainPoint = () => {
  return (
    <section className="py-20 px-4 bg-red-50">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-8">
          <span className="text-red-600">80%</span> of Your Customers Drop Off Due to Poor Availability
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-3xl mb-4">😤</div>
            <h3 className="font-semibold text-gray-900 mb-2">Missed Calls = Lost Revenue</h3>
            <p className="text-gray-600">Every unanswered call is money walking out the door</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-3xl mb-4">📅</div>
            <h3 className="font-semibold text-gray-900 mb-2">Double Bookings Kill Trust</h3>
            <p className="text-gray-600">Manual scheduling leads to embarrassing conflicts and angry clients</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-3xl mb-4">⏰</div>
            <h3 className="font-semibold text-gray-900 mb-2">After-Hours = Zero Bookings</h3>
            <p className="text-gray-600">Your competitors are capturing leads while you sleep</p>
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
