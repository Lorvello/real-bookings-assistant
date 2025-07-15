import { X } from "lucide-react";
import { useEffect } from "react";

interface MobileFirstMethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileFirstMethodologyModal = ({ isOpen, onClose }: MobileFirstMethodologyModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-700 animate-scale-in">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent">
            Mobile-First Research Methodology
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-slate-800/30 p-6 rounded-lg border border-slate-700/40">
            <h3 className="text-lg font-semibold text-white mb-3">Research Overview</h3>
            <p className="text-slate-300 leading-relaxed">
              Mobile usage patterns tracked through app analytics across 50,000+ users. Customer preference surveys with 15,000+ respondents analyzing communication channel preferences and response behaviors.
            </p>
          </div>
          
          <div className="bg-slate-800/30 p-6 rounded-lg border border-slate-700/40">
            <h3 className="text-lg font-semibold text-white mb-4">Methodology Details</h3>
            <ul className="space-y-3 text-slate-300">
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
          
          <div className="bg-slate-800/30 p-6 rounded-lg border border-slate-700/40">
            <h3 className="text-lg font-semibold text-white mb-3">Study Limitations</h3>
            <p className="text-slate-300 leading-relaxed">
              Results may vary by demographics, industry, and geographic location. Mobile behavior patterns can be influenced by device capabilities and network conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileFirstMethodologyModal;