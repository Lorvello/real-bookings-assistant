
import React from 'react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { Calendar, MessageCircle, Settings, Star } from 'lucide-react';

const BonusSection = () => {
  return (
    <ScrollAnimatedSection delay={100}>
      <section className="py-24 px-4 bg-gradient-to-br from-slate-900 via-gray-900 to-orange-900 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl"></div>
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-8 py-4 rounded-2xl mb-8 shadow-lg shadow-orange-500/25">
              <Star className="w-8 h-8 fill-current" />
              <h3 className="text-3xl font-bold">Bonus Features</h3>
              <Star className="w-8 h-8 fill-current" />
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-300 group hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-orange-500/25">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-white mb-4">Smart Notifications</h4>
              <p className="text-slate-300">
                Get instant alerts for new bookings, cancellations, and customer messages directly in your dashboard.
              </p>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-300 group hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-orange-500/25">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-white mb-4">Booking Insights</h4>
              <p className="text-slate-300">
                Detailed analytics about your bookings, peak times, and customer preferences to grow your business.
              </p>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-300 group hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-orange-500/25">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-white mb-4">Easy Management</h4>
              <p className="text-slate-300">
                Modify or cancel appointments within 5 minutes of booking. Full control over your schedule.
              </p>
            </div>
          </div>
        </div>
      </section>
    </ScrollAnimatedSection>
  );
};

export default BonusSection;
