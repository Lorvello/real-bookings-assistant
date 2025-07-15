
import { ArrowRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
const globalNetworkImage = "/lovable-uploads/a19bc752-d6ec-4498-944d-aa62ff083b1f.png";
const automationImage = "/lovable-uploads/c4bcff68-784e-45d1-9ab5-01bf16fcdf6a.png";
const paymentSuccessImage = "/lovable-uploads/ca02afe5-2602-415b-8d13-928d829aa206.png";

interface Benefit {
  id: string;
  title: string;
  description: string;
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
    image: globalNetworkImage,
    imageType: "global-network",
  },
  {
    id: "benefit-2", 
    title: "24/7 Booking Without Staff",
    description:
      "Your AI assistant never sleeps. Customers book appointments instantly at 3 AM or during busy hours without adding staff costs. Capture every booking opportunity while you focus on your business.",
    image: automationImage,
    imageType: "automation-24-7",
  },
  {
    id: "benefit-3",
    title: "80% Fewer No-Shows with Instant Payment", 
    description:
      "Prepayment through WhatsApp creates commitment. Get paid 50 to 75% faster (1 to 2 days vs 7 to 14 days) while dramatically reducing cancellations and improving cash flow.",
    image: paymentSuccessImage,
    imageType: "payment-success",
  },
];

export const WhatsAppBenefits = ({
  heading = "Why Choose WhatsApp Booking?",
  description = "Proven results that transform your business. Reach 2.95 billion customers instantly with 24/7 automation and secure payments.",
  linkUrl = "#",
  linkText = "Start Free 7-Day Trial",
  benefits = defaultBenefits,
  className = "",
}: WhatsAppBenefitsProps & { className?: string }) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const enhancedBenefits = benefits;
  
  return (
    <section className={className}>
      {/* Visual distinction background overlay */}
      <div className="relative">
        
        <div ref={ref} className="container max-w-5xl mx-auto px-8 lg:px-16 relative z-10">
          <div className="grid gap-3 md:grid-cols-2 lg:gap-4">
            {enhancedBenefits[0] && (
              <div className={`group md:col-span-2 flex flex-col md:flex-row overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900/95 to-slate-950/90 backdrop-blur-lg shadow-xl shadow-black/30 transition-all duration-300 ease-out transform-gpu isolate hover:scale-[1.03] hover:z-10 hover:shadow-2xl hover:shadow-emerald-500/40 hover:border-emerald-400/80 cursor-pointer ${isVisible ? 'opacity-100 animate-fade-in' : 'opacity-0'}`}>
                <div className="md:flex-1 md:min-h-[12rem] lg:min-h-[14rem] xl:min-h-[16rem] overflow-hidden rounded-t-xl md:rounded-l-xl md:rounded-tr-none">
                  <img
                    src={enhancedBenefits[0].image}
                    alt={enhancedBenefits[0].title}
                    className="aspect-[16/9] h-full w-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-110 group-hover:brightness-115"
                  />
                </div>
                <div className="md:flex-1 flex flex-col justify-center px-4 py-5 md:px-6 md:py-7 lg:px-8 lg:py-9 bg-gradient-to-br from-slate-900/95 to-slate-950/90">
                  <h3 className="mb-2 text-base font-bold tracking-tight text-white md:mb-3 md:text-lg lg:mb-4 lg:text-xl transition-all duration-300 group-hover:text-emerald-300 group-hover:drop-shadow-lg leading-tight">
                    {enhancedBenefits[0].title}
                  </h3>
                  <p className="text-slate-300 font-medium text-sm md:text-base lg:text-lg leading-relaxed transition-all duration-300 group-hover:text-slate-200">
                    {enhancedBenefits[0].description}
                  </p>
                </div>
              </div>
            )}
            {enhancedBenefits.slice(1).map((benefit, index) => (
              <div
                key={benefit.id}
                className={`group flex flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-gradient-to-br from-slate-900/95 to-slate-950/90 backdrop-blur-lg shadow-lg shadow-black/30 transition-all duration-300 ease-out transform-gpu isolate hover:scale-[1.03] hover:z-10 hover:shadow-xl hover:shadow-emerald-500/40 hover:border-emerald-400/80 cursor-pointer ${isVisible ? 'opacity-100 animate-fade-in' : 'opacity-0'}`}
              >
                <div className="overflow-hidden h-36 md:h-40 lg:h-44 rounded-t-xl">
                  <img
                    src={benefit.image}
                    alt={benefit.title}
                    className="h-full w-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-110 group-hover:brightness-115"
                  />
                </div>
                <div className="px-4 py-5 md:px-5 md:py-6 lg:px-6 lg:py-7 bg-gradient-to-br from-slate-900/95 to-slate-950/90">
                  <h3 className="mb-2 text-sm font-bold tracking-tight text-white md:mb-3 md:text-base lg:mb-4 lg:text-lg transition-all duration-300 group-hover:text-emerald-300 group-hover:drop-shadow-lg leading-tight">
                    {benefit.title}
                  </h3>
                  <p className="text-slate-300 font-medium text-xs md:text-sm lg:text-base leading-relaxed transition-all duration-300 group-hover:text-slate-200">
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
