
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

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
      "Reach customers where they already are. WhatsApp's universal adoption means no app downloads, no new accounts - just instant booking in the world's most popular messaging platform.",
    image: "https://www.shadcnblocks.com/images/block/placeholder-1.svg",
    imageType: "global-network",
  },
  {
    id: "benefit-2", 
    title: "24/7 Booking Without Staff",
    description:
      "Your AI assistant never sleeps. Customers book appointments instantly at 3 AM or during busy hours without adding staff costs. Capture every booking opportunity while you focus on your business.",
    image: "https://www.shadcnblocks.com/images/block/placeholder-2.svg",
    imageType: "automation-24-7",
  },
  {
    id: "benefit-3",
    title: "80% Fewer No-Shows with Instant Payment", 
    description:
      "Pre-payment through WhatsApp creates commitment. Get paid 50-75% faster (1-2 days vs 7-14) while dramatically reducing cancellations and improving cash flow.",
    image: "https://www.shadcnblocks.com/images/block/placeholder-3.svg",
    imageType: "payment-success",
  },
];

export const WhatsAppBenefits = ({
  heading = "Why Choose WhatsApp Booking?",
  description = "Proven results that transform your business. Reach 2.95 billion customers instantly with 24/7 automation and secure payments.",
  linkUrl = "#",
  linkText = "Start Free 7-Day Trial",
  benefits = defaultBenefits,
}: WhatsAppBenefitsProps) => {
  const [enhancedBenefits, setEnhancedBenefits] = useState(benefits);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateImages = async () => {
      try {
        const updatedBenefits = await Promise.all(
          benefits.map(async (benefit) => {
            try {
              const { data, error } = await supabase.functions.invoke('generate-whatsapp-benefits-images', {
                body: { type: benefit.imageType }
              });

              if (error) {
                console.error(`Error generating image for ${benefit.imageType}:`, error);
                return benefit; // Keep original on error
              }

              if (data?.success && data?.imageUrl) {
                return { ...benefit, image: data.imageUrl };
              }
              
              return benefit;
            } catch (err) {
              console.error(`Failed to generate image for ${benefit.imageType}:`, err);
              return benefit;
            }
          })
        );

        setEnhancedBenefits(updatedBenefits);
      } catch (error) {
        console.error('Error generating benefit images:', error);
      } finally {
        setLoading(false);
      }
    };

    generateImages();
  }, [benefits]);
  return (
    <section className="py-32 bg-slate-900">
      <div className="container flex flex-col gap-16 lg:px-16">
        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {enhancedBenefits[0] && (
            <div className="group flex flex-col overflow-clip rounded-xl border border-slate-700 bg-slate-800 md:col-span-2 md:grid md:grid-cols-2 md:gap-6 lg:gap-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10">
              <div className="md:min-h-[24rem] lg:min-h-[28rem] xl:min-h-[32rem] overflow-hidden">
                {loading ? (
                  <div className="aspect-[16/9] h-full w-full bg-slate-700 animate-pulse flex items-center justify-center">
                    <div className="text-slate-400 text-sm">Generating image...</div>
                  </div>
                ) : (
                  <img
                    src={enhancedBenefits[0].image}
                    alt={enhancedBenefits[0].title}
                    className="aspect-[16/9] h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="flex flex-col justify-center px-6 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
                <h3 className="mb-3 text-lg font-semibold text-white md:mb-4 md:text-2xl lg:mb-6 transition-colors duration-300 group-hover:text-emerald-300">
                  {enhancedBenefits[0].title}
                </h3>
                <p className="text-slate-400 lg:text-lg transition-colors duration-300 group-hover:text-slate-300">
                  {enhancedBenefits[0].description}
                </p>
              </div>
            </div>
          )}
          {enhancedBenefits.slice(1).map((benefit) => (
            <div
              key={benefit.id}
              className="group flex flex-col overflow-clip rounded-xl border border-slate-700 bg-slate-800 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10"
            >
              <div className="overflow-hidden">
                {loading ? (
                  <div className="aspect-[16/9] h-full w-full bg-slate-700 animate-pulse flex items-center justify-center">
                    <div className="text-slate-400 text-sm">Generating...</div>
                  </div>
                ) : (
                  <img
                    src={benefit.image}
                    alt={benefit.title}
                    className="aspect-[16/9] h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="px-6 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
                <h3 className="mb-3 text-lg font-semibold text-white md:mb-4 md:text-2xl lg:mb-6 transition-colors duration-300 group-hover:text-emerald-300">
                  {benefit.title}
                </h3>
                <p className="text-slate-400 lg:text-lg transition-colors duration-300 group-hover:text-slate-300">
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
