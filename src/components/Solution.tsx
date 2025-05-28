
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
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Automate Bookings Through WhatsApp
            </h3>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <span className="text-green-500 text-xl flex-shrink-0 mt-1">✅</span>
                <div>
                  <strong className="text-gray-900">Available 24/7:</strong>
                  <span className="text-gray-700 ml-1">Capture bookings anytime, even outside working hours</span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-green-500 text-xl flex-shrink-0 mt-1">✅</span>
                <div>
                  <strong className="text-gray-900">Tailored to Your Business:</strong>
                  <span className="text-gray-700 ml-1">Customize the agent to answer FAQs and book specific services</span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-green-500 text-xl flex-shrink-0 mt-1">✅</span>
                <div>
                  <strong className="text-gray-900">No Double Bookings:</strong>
                  <span className="text-gray-700 ml-1">Instantly syncs with your calendar to avoid conflicts</span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-green-500 text-xl flex-shrink-0 mt-1">✅</span>
                <div>
                  <strong className="text-gray-900">No-Code Setup:</strong>
                  <span className="text-gray-700 ml-1">Go live in under 5 minutes — no tech skills needed</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solution;
