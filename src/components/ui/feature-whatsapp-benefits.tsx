
import { ArrowRight } from "lucide-react";
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
  // Use the benefits directly with the imported images - no need for dynamic generation
  const enhancedBenefits = benefits;
  return (
    <section className={className}>
      <div className="container max-w-5xl mx-auto px-8 lg:px-16">
        <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
          {enhancedBenefits[0] && (
            <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-800/60 backdrop-blur-sm md:col-span-2 md:grid md:grid-cols-2 md:gap-4 lg:gap-6 transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/20 hover:border-emerald-400/50">
              <div className="md:min-h-[16rem] lg:min-h-[18rem] xl:min-h-[20rem] overflow-hidden">
                <img
                  src={enhancedBenefits[0].image}
                  alt={enhancedBenefits[0].title}
                  className="aspect-[16/9] h-full w-full object-cover object-center transition-all duration-500 ease-out group-hover:scale-110 group-hover:brightness-110"
                />
              </div>
              <div className="flex flex-col justify-center px-5 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
                <h3 className="mb-2 text-lg font-bold tracking-tight text-white md:mb-3 md:text-xl lg:mb-4 lg:text-2xl transition-all duration-300 group-hover:text-emerald-300 group-hover:drop-shadow-sm">
                  {enhancedBenefits[0].title}
                </h3>
                <p className="text-slate-400 font-medium text-sm md:text-base lg:text-lg leading-relaxed transition-all duration-300 group-hover:text-slate-300">
                  {enhancedBenefits[0].description}
                </p>
              </div>
            </div>
          )}
          {enhancedBenefits.slice(1).map((benefit) => (
            <div
              key={benefit.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-800/60 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/15 hover:border-emerald-400/40"
            >
              <div className="overflow-hidden h-48 md:h-52">
                <img
                  src={benefit.image}
                  alt={benefit.title}
                  className="h-full w-full object-cover object-center transition-all duration-500 ease-out group-hover:scale-110 group-hover:brightness-110"
                />
              </div>
              <div className="px-5 py-6 md:px-6 md:py-7 lg:px-7 lg:py-8">
                <h3 className="mb-2 text-lg font-bold tracking-tight text-white md:mb-3 md:text-xl lg:mb-4 transition-all duration-300 group-hover:text-emerald-300 group-hover:drop-shadow-sm">
                  {benefit.title}
                </h3>
                <p className="text-slate-400 font-medium text-sm md:text-base leading-relaxed transition-all duration-300 group-hover:text-slate-300">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
