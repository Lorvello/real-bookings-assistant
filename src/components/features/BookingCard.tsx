
import { LightningBoltIcon as BoltIcon } from "@radix-ui/react-icons";

export const BookingCard = () => {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* iPhone Mockup - positioned with mobile considerations */}
      <div className="absolute top-2 left-2 right-2 flex justify-center items-center lg:top-3 lg:left-3 lg:right-3 lg:h-[75%]" style={{ height: 'calc(100% - 3rem)' }}>
        <div className="w-40 h-full transform rotate-2 hover:rotate-0 transition-transform duration-500 ease-in-out sm:w-48 lg:w-60 lg:h-[85%] lg:rotate-3">
          {/* iPhone outer frame */}
          <div className="relative bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-[2.5rem] p-[3px] shadow-2xl h-full border border-gray-700">
            {/* iPhone screen bezel */}
            <div className="relative bg-black rounded-[2.2rem] p-[4px] h-full">
              {/* iPhone screen */}
              <div className="bg-white rounded-[1.8rem] relative h-full flex flex-col overflow-hidden shadow-inner">
                {/* iPhone notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-3 bg-black rounded-b-lg z-10"></div>
                
                {/* WhatsApp header */}
                <div className="bg-[#25D366] text-white px-2 py-1.5 flex items-center gap-1.5 pt-4">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-xs">🤖</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[8px]">Dental Care AI</h3>
                    <p className="text-[6px] text-white/90">online</p>
                  </div>
                </div>
                
                {/* Chat area - fills exactly from header to input */}
                <div className="bg-[#e5ddd5] flex-1 flex flex-col justify-between p-2 py-3">
                  <div className="space-y-2">
                    {/* Customer message */}
                    <div className="flex justify-end">
                      <div className="bg-[#dcf8c6] rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                        <p className="text-gray-800 text-[9px] font-medium leading-tight">Hi, I need to reschedule my appointment</p>
                      </div>
                    </div>
                    
                    {/* AI response 1 */}
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                        <p className="text-gray-800 text-[9px] font-medium leading-tight">Of course! You have a cleaning scheduled for tomorrow at 2:00 PM. When would work better for you?</p>
                      </div>
                    </div>
                    
                    {/* Customer choice */}
                    <div className="flex justify-end">
                      <div className="bg-[#dcf8c6] rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                        <p className="text-gray-800 text-[9px] font-medium leading-tight">Can we move it to next week Friday?</p>
                      </div>
                    </div>
                    
                    {/* AI response 3 - time slots */}
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                        <p className="text-gray-800 text-[9px] font-medium leading-tight">Perfect! Here are available times for Friday:<br />🕐 9:00 AM<br />🕐 1:00 PM<br />🕐 4:00 PM</p>
                      </div>
                    </div>
                    
                    {/* Customer time choice */}
                    <div className="flex justify-end">
                      <div className="bg-[#dcf8c6] rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                        <p className="text-gray-800 text-[9px] font-medium leading-tight">4:00 PM works</p>
                      </div>
                    </div>
                    
                    {/* Final confirmation */}
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg px-2 py-1.5 max-w-[75%] shadow-sm">
                        <p className="text-gray-800 text-[9px] font-medium leading-tight">Appointment rescheduled to Friday 4:00 PM ✅</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* WhatsApp Input Bar */}
                <div className="bg-gray-100 border-t border-gray-200 px-3 py-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-500 text-sm">😊</span>
                    <div className="flex-1 bg-white rounded-full px-2 py-1">
                      <div className="text-[9px] text-gray-400 font-medium">Type a message</div>
                    </div>
                    <span className="text-gray-500 text-sm">🎤</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background accent elements */}
      <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-500/20 rounded-full blur-lg" />
    </div>
  );
};
