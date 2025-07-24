import { GearIcon } from "@radix-ui/react-icons";
import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from '@/hooks/useTranslation';

export const PersonalizationCard = () => {
  const { t } = useTranslation();
  const [tonePosition, setTonePosition] = useState(33); // 33% for "Friendly"
  const [multiLanguage, setMultiLanguage] = useState(true);
  const [smartFAQ, setSmartFAQ] = useState(true);
  const [smartBooking, setSmartBooking] = useState(true);
  const [contextAI, setContextAI] = useState(true);
  const [proactiveMode, setProactiveMode] = useState(false);
  
  // Slider drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const animationFrameRef = useRef<number>();
  const sliderRef = useRef<HTMLDivElement>(null);

  // Smooth slider dragging with global event listeners and requestAnimationFrame
  const updateSliderPosition = useCallback((clientX: number) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      const clampedPercentage = Math.max(0, Math.min(100, percentage));
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(() => {
        setTonePosition(clampedPercentage);
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      updateSliderPosition(e.clientX);
    }
  }, [isDragging, updateSliderPosition]);

  const handleSliderTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging && e.touches[0]) {
      e.preventDefault();
      updateSliderPosition(e.touches[0].clientX);
    }
  }, [isDragging, updateSliderPosition]);

  const handleSliderMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isDragging]);

  const handleSliderTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isDragging]);

  // Global event listeners for smooth dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleSliderMouseUp);
      document.addEventListener('touchmove', handleSliderTouchMove, { passive: false });
      document.addEventListener('touchend', handleSliderTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleSliderMouseUp);
        document.removeEventListener('touchmove', handleSliderTouchMove);
        document.removeEventListener('touchend', handleSliderTouchEnd);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isDragging, handleMouseMove, handleSliderMouseUp, handleSliderTouchMove, handleSliderTouchEnd]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* AI Agent Customization Interface - placed directly on card background */}
      <div className="absolute inset-3 flex flex-col">
        {/* AI Personality Section */}
        <div className="mb-3">
          <p className="text-slate-300 text-[8px] font-medium mb-2">AI Personality</p>
          
          {/* Tone Slider */}
          <div className="mb-2">
            <div className="flex justify-between text-[6px] text-slate-400 mb-1">
              <span>{t('featureCards.personalization.automatedTone')}</span>
              <span>Friendly</span>
              <span>{t('featureCards.personalization.personalizedTone')}</span>
            </div>
            <div 
              ref={sliderRef}
              className="relative h-1 bg-slate-600 rounded-full cursor-pointer"
              onClick={(e) => {
                if (!isDragging) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = (x / rect.width) * 100;
                  setTonePosition(Math.max(0, Math.min(100, percentage)));
                }
              }}
              onMouseDown={(e) => {
                setIsDragging(true);
                e.preventDefault();
              }}
              onTouchStart={(e) => {
                setIsDragging(true);
                e.preventDefault();
              }}
            >
              <div 
                className={`absolute w-2 h-2 bg-primary rounded-full -top-0.5 shadow-sm cursor-pointer ${
                  isDragging ? 'scale-110 transition-none' : 'transition-all duration-200 hover:scale-110'
                }`}
                style={{ left: `${tonePosition}%`, transform: 'translateX(-50%)' }}
              />
            </div>
          </div>
          
          {/* Language Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-[7px]">{t('featureCards.personalization.multiLanguage')}</span>
            <div 
              className={`w-4 h-2 rounded-full relative cursor-pointer transition-all duration-300 hover:scale-110 ${
                multiLanguage ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-slate-500'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setMultiLanguage(!multiLanguage);
              }}
            >
              <div 
                className={`w-1.5 h-1.5 bg-white rounded-full absolute top-0.25 shadow-sm transition-all duration-300 ${
                  multiLanguage ? 'translate-x-2' : 'translate-x-0'
                }`} 
              />
            </div>
          </div>
        </div>
        
        {/* Smart Features Section - Bottom 60% in 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* FAQ Management */}
          <div className={`bg-slate-700/40 rounded p-1.5 transition-all duration-200 hover:bg-slate-700/60 ${
            smartFAQ ? 'border border-emerald-500/30' : 'border border-slate-600/30'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-[7px] font-medium">{t('featureCards.personalization.smartFaq')}</span>
              <div 
                className={`w-3 h-1.5 rounded-full relative transition-all duration-300 hover:scale-110 cursor-pointer ${
                  smartFAQ ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40' : 'bg-slate-500'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSmartFAQ(!smartFAQ);
                }}
              >
                <div className={`w-1 h-1 bg-white rounded-full absolute top-0.25 transition-all duration-300 ${
                  smartFAQ ? 'translate-x-1.5 shadow-sm' : 'translate-x-0'
                }`} />
              </div>
            </div>
            <p className={`text-[6px] transition-colors duration-200 ${
              smartFAQ ? 'text-emerald-300' : 'text-slate-400'
            }`}>{t('featureCards.personalization.autoAnswers')}</p>
          </div>
          
          {/* Booking Logic */}
          <div className={`bg-slate-700/40 rounded p-1.5 transition-all duration-200 hover:bg-slate-700/60 ${
            smartBooking ? 'border border-emerald-500/30' : 'border border-slate-600/30'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-[7px] font-medium">{t('featureCards.personalization.smartBooking')}</span>
              <div 
                className={`w-3 h-1.5 rounded-full relative transition-all duration-300 hover:scale-110 cursor-pointer ${
                  smartBooking ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40' : 'bg-slate-500'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSmartBooking(!smartBooking);
                }}
              >
                <div className={`w-1 h-1 bg-white rounded-full absolute top-0.25 transition-all duration-300 ${
                  smartBooking ? 'translate-x-1.5 shadow-sm' : 'translate-x-0'
                }`} />
              </div>
            </div>
            <p className={`text-[6px] transition-colors duration-200 ${
              smartBooking ? 'text-emerald-300' : 'text-slate-400'
            }`}>{t('featureCards.personalization.upselling')}</p>
          </div>
          
          {/* Context Awareness */}
          <div className={`bg-slate-700/40 rounded p-1.5 transition-all duration-200 hover:bg-slate-700/60 ${
            contextAI ? 'border border-primary/30' : 'border border-slate-600/30'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-[7px] font-medium">{t('featureCards.personalization.contextAi')}</span>
              <div 
                className={`w-3 h-1.5 rounded-full relative transition-all duration-300 hover:scale-110 cursor-pointer ${
                  contextAI ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-slate-500'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setContextAI(!contextAI);
                }}
              >
                <div className={`w-1 h-1 bg-white rounded-full absolute top-0.25 transition-all duration-300 ${
                  contextAI ? 'translate-x-1.5 shadow-sm' : 'translate-x-0'
                }`} />
              </div>
            </div>
            <p className={`text-[6px] transition-colors duration-200 ${
              contextAI ? 'text-primary' : 'text-slate-400'
            }`}>{t('featureCards.personalization.remembersPreferences')}</p>
          </div>
          
          {/* Proactive Engagement */}
          <div className={`bg-slate-700/40 rounded p-1.5 transition-all duration-200 hover:bg-slate-700/60 ${
            proactiveMode ? 'border border-primary/30' : 'border border-slate-600/30'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-[7px] font-medium">{t('featureCards.personalization.proactive')}</span>
              <div 
                className={`w-3 h-1.5 rounded-full relative transition-all duration-300 hover:scale-110 cursor-pointer ${
                  proactiveMode ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-slate-500'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setProactiveMode(!proactiveMode);
                }}
              >
                <div className={`w-1 h-1 bg-white rounded-full absolute top-0.25 transition-all duration-300 ${
                  proactiveMode ? 'translate-x-1.5 shadow-sm' : 'translate-x-0'
                }`} />
              </div>
            </div>
            <p className={`text-[6px] transition-colors duration-200 ${
              proactiveMode ? 'text-primary' : 'text-slate-400'
            }`}>{t('featureCards.personalization.sendsFollowUps')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
