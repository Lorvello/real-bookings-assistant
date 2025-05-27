
import Hero from "@/components/Hero";
import Timeline from "@/components/Timeline";
import CalendarDisplay from "@/components/CalendarDisplay";
import PainPoint from "@/components/PainPoint";
import Solution from "@/components/Solution";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Results from "@/components/Results";
import SocialProof from "@/components/SocialProof";
import CallToAction from "@/components/CallToAction";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <Timeline />
      <CalendarDisplay 
        src="https://www.notion.com/_next/image?url=/front-static/pages/calendar/notion-calendar-desktop-v2.png&w=2048&q=75"
        alt="Calendar Interface showing booked appointments"
        width={1274}
        height={1043}
      />
      <PainPoint />
      <Solution />
      <HowItWorks />
      <Features />
      <Results />
      <SocialProof />
      <CallToAction />
    </div>
  );
};

export default Index;
