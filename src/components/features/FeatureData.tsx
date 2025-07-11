
import { LightningBoltIcon as BoltIcon, GearIcon, CalendarIcon, BellIcon, BarChartIcon as BarChart3Icon, GlobeIcon, DesktopIcon as MonitorIcon } from "@radix-ui/react-icons";
import { BookingCard } from "./BookingCard";
import { PersonalizationCard } from "./PersonalizationCard";
import { CalendarCard } from "./CalendarCard";
import { SmartResponsesCard } from "./SmartResponsesCard";
import { RemindersCard } from "./RemindersCard";
import { AnalyticsCard } from "./AnalyticsCard";
import { MultiLanguageCard } from "./MultiLanguageCard";
import { MonitoringCard } from "./MonitoringCard";

export const bookingFeatures = [
  {
    Icon: BoltIcon,
    name: "100% Automatic Bookings",
    description: "No manual intervention needed. Books, confirms and reschedules automatically",
    href: "/features/automation",
    cta: "Learn more",
    background: <BookingCard />,
    className: "lg:row-start-1 lg:row-end-3 lg:col-start-1 lg:col-end-2",
    hideCta: true
  },
  {
    Icon: GearIcon,
    name: "Fully Personalized",
    description: "Customize the AI Agent to your services, FAQs and booking logic",
    href: "/features/personalization",
    cta: "Learn more",
    background: <PersonalizationCard />,
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2"
  },
  {
    Icon: CalendarIcon,
    name: "Own Calendar",
    description: "Get your own professional calendar with complete control",
    href: "/features/dashboard",
    cta: "Learn more",
    background: <CalendarCard />,
    className: "lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-3"
  },
  {
    Icon: BoltIcon,
    name: "Smart AI Responses",
    description: "See how our AI provides intelligent, contextual responses",
    href: "/features/ai-responses",
    cta: "Learn more",
    background: <SmartResponsesCard />,
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-4"
  },
  {
    Icon: BellIcon,
    name: "Automatic Reminders",
    description: "Sends confirmation and reminder messages to reduce no-shows",
    href: "/features/reminders",
    cta: "Learn more",
    background: <RemindersCard />,
    className: "lg:row-start-3 lg:row-end-4 lg:col-start-1 lg:col-end-2"
  },
  {
    Icon: BarChart3Icon,
    name: "Detailed Analytics",
    description: "Track booking rates, popular times and generated revenue",
    href: "/features/analytics",
    cta: "Learn more",
    background: <AnalyticsCard />,
    className: "lg:col-start-3 lg:col-end-4 lg:row-start-3 lg:row-end-4"
  },
  {
    Icon: GlobeIcon,
    name: "Multi-language Support",
    description: "Automatically communicates in your customers' preferred language",
    href: "/features/multilingual",
    cta: "Learn more",
    background: <MultiLanguageCard />,
    className: "lg:col-start-1 lg:col-end-3 lg:row-start-4 lg:row-end-5"
  },
  {
    Icon: MonitorIcon,
    name: "Real-time Dashboard Monitoring",
    description: "View live bookings, performance and customer interactions",
    href: "/features/monitoring",
    cta: "Learn more",
    background: <MonitoringCard />,
    className: "lg:col-start-3 lg:col-end-4 lg:row-start-4 lg:row-end-5"
  }
];
