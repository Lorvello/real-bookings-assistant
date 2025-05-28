
import { Button } from "@/components/ui/button";
import { MessageCircle, Brain, Target } from "lucide-react";

const Solution = () => {
  return (
    <section className="py-20 px-4 bg-red-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Meet Your <span className="text-green-600">24/7 AI Appointment Agent</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            The smart WhatsApp assistant that books qualified appointments while you focus on what you do best
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto mb-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-green-600" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Instant Replies on WhatsApp
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Never miss a lead again — your AI agent responds in seconds, 24/7, like a real staff member.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Brain className="w-8 h-8 text-green-600" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Answers FAQs Like a Human
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Trained on your services, prices, and policies — the agent handles customer questions with ease.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Target className="w-8 h-8 text-green-600" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Works for Any Appointment Business
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    From salons to clinics, fitness studios to consultants — the AI adapts to any business that books appointments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual transition element */}
        <div className="text-center py-8">
          <p className="text-sm font-semibold text-red-600 uppercase tracking-wider">
            Without an AI Agent, here's what happens…
          </p>
        </div>
      </div>
    </section>
  );
};

export default Solution;
