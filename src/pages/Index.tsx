
import Hero from "@/components/Hero";
import Timeline from "@/components/Timeline";
import CalendarDisplay from "@/components/CalendarDisplay";
import ProcessSection from "@/components/ProcessSection";
import PainPoint from "@/components/PainPoint";
import Solution from "@/components/Solution";
import Features from "@/components/Features";
import Results from "@/components/Results";
import SocialProof from "@/components/SocialProof";
import CallToAction from "@/components/CallToAction";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <ProcessSection />
      <Timeline />
      <CalendarDisplay 
        src="https://www.notion.com/_next/image?url=/front-static/pages/calendar/notion-calendar-desktop-v2.png&w=2048&q=75"
        alt="Calendar Interface showing booked appointments"
        width={1274}
        height={1043}
      />
      <PainPoint />
      <Solution />
      <Features />
      <Results />
      <SocialProof />
      <CallToAction />
    </div>
  );
};

export default Index;
