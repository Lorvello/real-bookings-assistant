import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useState, useRef, useEffect } from "react";
const globalNetworkImage = "/lovable-uploads/a19bc752-d6ec-4498-944d-aa62ff083b1f.png";
const automationImage = "/lovable-uploads/c4bcff68-784e-45d1-9ab5-01bf16fcdf6a.png";
const paymentSuccessImage = "/lovable-uploads/ca02afe5-2602-415b-8d13-928d829aa206.png";

interface Benefit {
  id: string;
  title: string;
  description: string;
  mobileDescription?: string;
  image: string;
  imageType: string;
}

interface WhatsAppBenefitsProps {
  heading?: string;
  description?: string;
  linkUrl?: string;
  linkText?: string;
  benefits?: Benefit[];
}

const defaultBenefits = [
  {
    id: "benefit-1",
    title: "2.95 Billion Customers Ready to Book",
    description:
      "Reach customers where they already are. WhatsApp's universal adoption means no app downloads, no new accounts. Just instant booking in the world's most popular messaging platform.",
    mobileDescription: "Connect instantly to billions of users without app downloads. Book directly through their favorite messaging platform.",
    image: globalNetworkImage,
    imageType: "global-network",
  },
  {
    id: "benefit-2", 
    title: "24/7 Booking Without Staff",
    description:
      "Your AI assistant never sleeps. Customers book appointments instantly at 3 AM or during busy hours without adding staff costs. Capture every booking opportunity while you focus on your business.",
    mobileDescription: "AI handles bookings 24/7 while you sleep or serve clients. Zero missed opportunities, no extra staff costs.",
    image: automationImage,
    imageType: "automation-24-7",
  },
  {
    id: "benefit-3",
    title: "80% Fewer No-Shows with Instant Payment", 
    description:
      "Prepayment through WhatsApp creates commitment. Get paid 50 to 75% faster (1 to 2 days vs 7 to 14 days) while dramatically reducing cancellations and improving cash flow.",
    mobileDescription: "Secure WhatsApp payments create real commitment. Get paid instantly instead of waiting weeks for traditional invoicing.",
    image: paymentSuccessImage,
    imageType: "payment-success",
  },
];

export const WhatsAppBenefits = ({
  heading = "Why Choose WhatsApp Booking?",
  description = "Proven results that transform your business. Reach 2.95 billion customers instantly with 24/7 automation and secure payments.",
  linkUrl = "#",
  linkText = "Start Free 30-Day Trial",
  benefits = defaultBenefits,
  className = "",
}: WhatsAppBenefitsProps & { className?: string }) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const enhancedBenefits = benefits;
  
  // Mobile slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideRef = useRef<HTMLDivElement>(null);
  
  const nextSlide = () => {
    setCurrentSlide((prev) => Math.min(prev + 1, enhancedBenefits.length - 1));
  };
  
  const prevSlide = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };
  
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Handle touch gestures
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentSlide < enhancedBenefits.length - 1) {
      nextSlide();
    } else if (isRightSwipe && currentSlide > 0) {
      prevSlide();
    }
  };
  
  return (
    <section className={className}>
      {/* Mobile Slideshow Layout with Bioluminescent Effects */}
      <div className="md:hidden relative py-4">
        <div ref={ref} className="max-w-sm mx-auto px-6 pb-4 relative">
          {/* Slide container with smoother transition */}
          <div 
            className="relative overflow-hidden rounded-2xl"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div 
              ref={slideRef}
              className="flex gap-4 transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * (100 + 4)}%)` }}
            >
              {enhancedBenefits.map((benefit, index) => (
                <div
                  key={benefit.id}
                  className="w-full flex-shrink-0 opacity-100"
                >
                  <div className="feature-card rounded-2xl overflow-hidden mx-2">
                    <div className="h-48 overflow-hidden relative">
                      <img
                        src={benefit.image}
                        alt={benefit.title}
                        className="h-full w-full object-cover object-center opacity-70"
                        width="340"
                        height="256"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(217,35%,12%)] via-[hsl(217,35%,12%)]/60 to-transparent"></div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-white mb-3 leading-tight">
                        {benefit.title}
                      </h3>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        {benefit.mobileDescription || benefit.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation arrows positioned outside */}
          {currentSlide > 0 && (
            <div className="absolute top-1/2 -translate-y-1/2 -left-2 z-20">
              <button
                onClick={prevSlide}
                className="p-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-colors duration-200 shadow-lg"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
          {currentSlide < enhancedBenefits.length - 1 && (
            <div className="absolute top-1/2 -translate-y-1/2 -right-2 z-20">
              <button
                onClick={nextSlide}
                className="p-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-colors duration-200 shadow-lg"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* Slide indicators */}
          <div className="flex justify-center mt-4 space-x-2">
            {enhancedBenefits.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentSlide 
                    ? 'bg-emerald-400 w-6' 
                    : 'bg-slate-600 hover:bg-slate-500'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
          
          {/* Swipe hint */}
          <div className="text-center mt-3 px-4">
            <p className="text-xs text-slate-500">
              Swipe or tap arrows to explore
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Layout with Bioluminescent Effects */}
      <div className="hidden md:block relative">
        <div ref={ref} className="container max-w-5xl mx-auto px-8 lg:px-16 relative z-10">
          <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
            {enhancedBenefits[0] && (
              <div className={`group md:col-span-2 flex flex-col md:flex-row overflow-hidden rounded-2xl feature-card card-glow cursor-pointer ${isVisible ? 'opacity-100 animate-appear' : 'opacity-0'}`}>
                <div className="md:flex-1 md:min-h-[16rem] lg:min-h-[18rem] xl:min-h-[20rem] overflow-hidden relative">
                  <img
                    src={enhancedBenefits[0].image}
                    alt={enhancedBenefits[0].title}
                    className="aspect-[16/9] h-full w-full object-cover object-center transition-all duration-700 ease-out opacity-70 group-hover:opacity-90 group-hover:scale-105"
                    width="340"
                    height="256"
                    loading="eager"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[hsl(217,35%,12%)] via-[hsl(217,35%,12%)]/60 to-transparent"></div>
                  {/* Animated ping dots */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute w-3 h-3 bg-emerald-400 rounded-full top-0 left-12 animate-ping opacity-75"></div>
                      <div className="absolute w-2 h-2 bg-emerald-400 rounded-full bottom-4 right-0 animate-ping opacity-75" style={{ animationDelay: '0.5s' }}></div>
                      <div className="absolute w-2 h-2 bg-emerald-400 rounded-full top-8 -left-8 animate-ping opacity-75" style={{ animationDelay: '1s' }}></div>
                    </div>
                  </div>
                </div>
                <div className="md:flex-1 flex flex-col justify-center p-6 md:p-8">
                  <h3 className="mb-3 text-2xl md:text-3xl font-semibold text-white md:mb-4 transition-all duration-300 leading-tight">
                    {enhancedBenefits[0].title.split('Ready to Book')[0]}
                    <span className="text-emerald-400">Ready to Book</span>
                  </h3>
                  <p className="text-slate-400 text-base md:text-lg leading-relaxed transition-all duration-300 group-hover:text-slate-300">
                    {enhancedBenefits[0].description}
                  </p>
                </div>
              </div>
            )}
            {enhancedBenefits.slice(1).map((benefit, index) => (
              <div
                key={benefit.id}
                className={`group flex flex-col overflow-hidden rounded-2xl feature-card card-glow cursor-pointer ${isVisible ? 'opacity-100 animate-appear' : 'opacity-0'}`}
              >
                <div className="overflow-hidden h-40 md:h-48 relative">
                  <img
                    src={benefit.image}
                    alt={benefit.title}
                    className="h-full w-full object-cover object-center transition-all duration-700 ease-out opacity-60 group-hover:opacity-80 group-hover:scale-105"
                    width="347"
                    height="194"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[hsl(217,35%,12%)] via-[hsl(217,35%,12%)]/50 to-transparent"></div>
                  {/* Icon badge */}
                  <div className="absolute top-4 right-4 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    {index === 0 ? (
                      <svg className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22,4 12,14.01 9,11.01"/>
                      </svg>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="mb-2 text-xl md:text-2xl font-semibold text-white transition-all duration-300 leading-tight">
                    {benefit.title.includes('Without Staff') ? (
                      <>24/7 Booking <span className="text-emerald-400">Without Staff</span></>
                    ) : benefit.title.includes('Instant Payment') ? (
                      <>80% Fewer No-Shows with <span className="text-emerald-400">Instant Payment</span></>
                    ) : (
                      benefit.title
                    )}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed transition-all duration-300 group-hover:text-slate-300">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
