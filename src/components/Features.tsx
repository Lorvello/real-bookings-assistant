
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { bookingFeatures } from "./features/FeatureData";
import StaggeredAnimationContainer from './StaggeredAnimationContainer';

const Features = () => {
  return (
    <section className="py-16 md:py-16 px-3 md:px-4 relative overflow-hidden" style={{
      backgroundColor: 'hsl(217, 35%, 12%)'
    }}>
      {/* Background decoration - Optimized for mobile */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>
      
      
      <div className="max-w-6xl mx-auto relative z-10 px-6 md:px-8 lg:px-12">
        <StaggeredAnimationContainer 
          staggerDelay={200} 
          variant="features"
          className="space-y-8 md:space-y-12"
        >
          {/* Header - HEADERS (Largest) */}
          <div className="text-center pt-16 md:pt-20">
            <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
              Everything You Need To{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                Automate Bookings
              </span>
            </h2>
            <p className="text-xs md:text-lg text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
              <span className="md:hidden">Features that maximize bookings and revenue</span>
              <span className="hidden md:inline">Powerful features that work seamlessly together to maximize your bookings and revenue</span>
            </p>
          </div>
          
          {/* Bento Grid Features */}
          <div className="mb-12 md:mb-32">
            <BentoGrid>
              {bookingFeatures.map((feature, idx) => <BentoCard key={idx} {...feature} />)}
            </BentoGrid>
          </div>
        </StaggeredAnimationContainer>
      </div>
    </section>
  );
};

export default Features;
