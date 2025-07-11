
import { ArrowRight } from "lucide-react";

interface Benefit {
  id: string;
  title: string;
  description: string;
  image: string;
}

interface WhatsAppBenefitsProps {
  heading?: string;
  description?: string;
  linkUrl?: string;
  linkText?: string;
  benefits?: Benefit[];
}

export const WhatsAppBenefits = ({
  heading = "Why Choose WhatsApp Booking?",
  description = "Proven results that transform your business. Reach 2.95 billion customers instantly with 24/7 automation and secure payments.",
  linkUrl = "#",
  linkText = "Start Free 7-Day Trial",
  benefits = [
    {
      id: "benefit-1",
      title: "2.95 Billion Customers Ready to Book",
      description:
        "Reach customers where they already are. WhatsApp's universal adoption means no app downloads, no new accounts - just instant booking in the world's most popular messaging platform.",
      image: "https://www.shadcnblocks.com/images/block/placeholder-1.svg",
    },
    {
      id: "benefit-2", 
      title: "24/7 Booking Without Staff",
      description:
        "Your AI assistant never sleeps. Customers book appointments instantly at 3 AM or during busy hours without adding staff costs. Capture every booking opportunity while you focus on your business.",
      image: "https://www.shadcnblocks.com/images/block/placeholder-2.svg",
    },
    {
      id: "benefit-3",
      title: "80% Fewer No-Shows with Instant Payment", 
      description:
        "Pre-payment through WhatsApp creates commitment. Get paid 50-75% faster (1-2 days vs 7-14) while dramatically reducing cancellations and improving cash flow.",
      image: "https://www.shadcnblocks.com/images/block/placeholder-3.svg",
    },
  ],
}: WhatsAppBenefitsProps) => {
  return (
    <section className="py-32 bg-slate-900">
      <div className="container flex flex-col gap-16 lg:px-16">
        <div className="lg:max-w-sm">
          <h2 className="mb-3 text-xl font-semibold text-white md:mb-4 md:text-4xl lg:mb-6">
            {heading}
          </h2>
          <p className="mb-8 text-slate-400 lg:text-lg">{description}</p>
          <a
            href={linkUrl}
            className="group flex items-center text-xs font-medium text-emerald-400 hover:text-emerald-300 md:text-base lg:text-lg"
          >
            {linkText}
            <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {benefits[0] && (
            <div className="flex flex-col overflow-clip rounded-xl border border-slate-700 bg-slate-800 md:col-span-2 md:grid md:grid-cols-2 md:gap-6 lg:gap-8">
              <div className="md:min-h-[24rem] lg:min-h-[28rem] xl:min-h-[32rem]">
                <img
                  src={benefits[0].image}
                  alt={benefits[0].title}
                  className="aspect-[16/9] h-full w-full object-cover object-center"
                />
              </div>
              <div className="flex flex-col justify-center px-6 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
                <h3 className="mb-3 text-lg font-semibold text-white md:mb-4 md:text-2xl lg:mb-6">
                  {benefits[0].title}
                </h3>
                <p className="text-slate-400 lg:text-lg">
                  {benefits[0].description}
                </p>
              </div>
            </div>
          )}
          {benefits.slice(1).map((benefit) => (
            <div
              key={benefit.id}
              className="flex flex-col overflow-clip rounded-xl border border-slate-700 bg-slate-800"
            >
              <div>
                <img
                  src={benefit.image}
                  alt={benefit.title}
                  className="aspect-[16/9] h-full w-full object-cover object-center"
                />
              </div>
              <div className="px-6 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
                <h3 className="mb-3 text-lg font-semibold text-white md:mb-4 md:text-2xl lg:mb-6">
                  {benefit.title}
                </h3>
                <p className="text-slate-400 lg:text-lg">
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
