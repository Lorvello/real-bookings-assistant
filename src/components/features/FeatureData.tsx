
import { LightningBoltIcon as BoltIcon, GearIcon, CalendarIcon, BellIcon, BarChartIcon as BarChart3Icon, GlobeIcon, DesktopIcon as MonitorIcon } from "@radix-ui/react-icons";
import { BookingCard } from "./BookingCard";
import { PersonalizationCard } from "./PersonalizationCard";
import { CalendarCard } from "./CalendarCard";
import { SmartResponsesCard } from "./SmartResponsesCard";
import { RemindersCard } from "./RemindersCard";
import { AnalyticsCard } from "./AnalyticsCard";
import { MultiLanguageCard } from "./MultiLanguageCard";
import { MonitoringCard } from "./MonitoringCard";
import { useTranslation } from '@/hooks/useTranslation';

export const useBookingFeatures = () => {
  const { t } = useTranslation();
  
  return [
    {
      Icon: BoltIcon,
      name: t('bookingFeatures.automation.name'),
      description: t('bookingFeatures.automation.description'),
      href: "/features/automation",
      cta: t('bookingFeatures.automation.cta'),
      background: <BookingCard />,
      className: "lg:row-start-1 lg:row-end-3 lg:col-start-1 lg:col-end-2",
      hideCta: true
    },
    {
      Icon: GearIcon,
      name: t('bookingFeatures.personalization.name'),
      description: t('bookingFeatures.personalization.description'),
      href: "/features/personalization",
      cta: t('bookingFeatures.personalization.cta'),
      background: <PersonalizationCard />,
      className: "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2"
    },
    {
      Icon: CalendarIcon,
      name: t('bookingFeatures.calendar.name'),
      description: t('bookingFeatures.calendar.description'),
      href: "/features/dashboard",
      cta: t('bookingFeatures.calendar.cta'),
      background: <CalendarCard />,
      className: "lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-3"
    },
    {
      Icon: BoltIcon,
      name: t('bookingFeatures.smartResponses.name'),
      description: t('bookingFeatures.smartResponses.description'),
      href: "/features/ai-responses",
      cta: t('bookingFeatures.smartResponses.cta'),
      background: <SmartResponsesCard />,
      className: "lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-4"
    },
    {
      Icon: BellIcon,
      name: t('bookingFeatures.reminders.name'),
      description: t('bookingFeatures.reminders.description'),
      href: "/features/reminders",
      cta: t('bookingFeatures.reminders.cta'),
      background: <RemindersCard />,
      className: "lg:row-start-3 lg:row-end-4 lg:col-start-1 lg:col-end-2"
    },
    {
      Icon: BarChart3Icon,
      name: t('bookingFeatures.analytics.name'),
      description: t('bookingFeatures.analytics.description'),
      href: "/features/analytics",
      cta: t('bookingFeatures.analytics.cta'),
      background: <AnalyticsCard />,
      className: "lg:col-start-3 lg:col-end-4 lg:row-start-3 lg:row-end-4"
    },
    {
      Icon: GlobeIcon,
      name: t('bookingFeatures.multilanguage.name'),
      description: t('bookingFeatures.multilanguage.description'),
      href: "/features/multilingual",
      cta: t('bookingFeatures.multilanguage.cta'),
      background: <MultiLanguageCard />,
      className: "lg:col-start-1 lg:col-end-3 lg:row-start-4 lg:row-end-5"
    },
    {
      Icon: MonitorIcon,
      name: t('bookingFeatures.monitoring.name'),
      description: t('bookingFeatures.monitoring.description'),
      href: "/features/monitoring",
      cta: t('bookingFeatures.monitoring.cta'),
      background: <MonitoringCard />,
      className: "lg:col-start-3 lg:col-end-4 lg:row-start-4 lg:row-end-5"
    }
  ];
};
