import React from 'react';
import { X } from 'lucide-react';

interface CaseStudiesMethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CaseStudiesMethodologyModal: React.FC<CaseStudiesMethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Case Studies Methodology</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="space-y-6 text-slate-300">
            <div>
              <h3 className="text-lg font-semibold text-emerald-400 mb-3">Research Overview</h3>
              <p className="leading-relaxed">
                Our case studies methodology involves comprehensive business performance analysis before and after WhatsApp integration. Each case study represents verified business results tracked through multiple measurement systems and validated by third-party audits.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-emerald-400 mb-3">Methodology Details</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong>Business performance tracked</strong> over 6-12 month periods before and after WhatsApp implementation</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong>Staff time measurements</strong> recorded through time-tracking systems and productivity audits</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong>Revenue impact calculated</strong> through booking volume analysis and missed opportunity tracking</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong>No-show rates measured</strong> via appointment confirmation systems and attendance records</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong>Customer satisfaction measured</strong> through post-service surveys and retention analysis</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong>Implementation success tracked</strong> through real-time calendar integration and booking analytics</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-emerald-400 mb-3">Data Sources</h3>
              <ul className="space-y-2">
                <li>• Business management software integrations</li>
                <li>• Time-tracking system reports</li>
                <li>• Calendar and booking system analytics</li>
                <li>• Customer satisfaction surveys</li>
                <li>• Revenue tracking and financial analysis</li>
                <li>• Staff productivity measurements</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-emerald-400 mb-3">Study Limitations</h3>
              <p className="leading-relaxed">
                Case studies represent individual business results. Outcomes may vary based on business size, implementation quality, staff training, and industry-specific factors. Results reflect businesses that completed full integration and training programs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseStudiesMethodologyModal;