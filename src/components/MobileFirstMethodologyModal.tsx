import { X } from "lucide-react";

interface MobileFirstMethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileFirstMethodologyModal = ({ isOpen, onClose }: MobileFirstMethodologyModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          >
            <X size={24} />
          </button>
          
          <div className="p-8">
            <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Mobile-First Research Methodology
            </h2>
            
            <div className="space-y-6">
              <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Research Overview</h3>
                <p className="text-gray-300 leading-relaxed">
                  Mobile usage patterns tracked through app analytics across 50,000+ users. Customer preference surveys with 15,000+ respondents analyzing communication channel preferences and response behaviors.
                </p>
              </div>
              
              <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Methodology Details</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>App analytics tracking user engagement patterns across mobile platforms</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Customer preference surveys measuring satisfaction across communication channels</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Response time comparisons between mobile and desktop interactions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Satisfaction measurements via post-interaction feedback systems</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Study Limitations</h3>
                <p className="text-gray-300 leading-relaxed">
                  Results may vary by demographics, industry, and geographic location. Mobile behavior patterns can be influenced by device capabilities and network conditions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileFirstMethodologyModal;