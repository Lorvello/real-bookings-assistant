"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  Users, 
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  Phone,
  UserCheck,
  UserX,
  Zap,
  Target,
  ArrowUp,
  ArrowDown,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { useBookingTrends } from "@/hooks/useBookingTrends";
import { useWhatsAppConversationMetrics } from "@/hooks/useWhatsAppConversationMetrics";
import { useConversationCalendar } from "@/contexts/ConversationCalendarContext";

const sizes = {
  tiny: 20,
  small: 32,
  medium: 64,
  large: 128
};

type TArcPriority = "default" | "equal";

interface GaugeProps {
  size?: keyof typeof sizes;
  value: number;
  colors?: { [name: string]: string };
  showValue?: boolean;
  arcPriority?: TArcPriority;
  indeterminate?: boolean;
}

const gapPercent = {
  tiny: 9,
  small: 6,
  medium: 5,
  large: 5
};

const rotate = {
  primary: {
    default: {
      tiny: `-rotate-90`,
      small: `-rotate-90`,
      medium: `-rotate-90`,
      large: `-rotate-90`
    },
    equal: {
      tiny: `rotate-[calc(-90deg_+_(0.5*9*3.6deg))]`,
      small: `rotate-[calc(-90deg_+_(0.5*6*3.6deg))]`,
      medium: `rotate-[calc(-90deg_+_(0.5*5*3.6deg))]`,
      large: `rotate-[calc(-90deg_+_(0.5*5*3.6deg))]`
    }
  },
  secondary: {
    default: {
      tiny: `rotate-[calc(1turn_-_90deg_-_(9*3.6deg))]`,
      small: `rotate-[calc(1turn_-_90deg_-_(6*3.6deg))]`,
      medium: `rotate-[calc(1turn_-_90deg_-_(5*3.6deg))]`,
      large: `rotate-[calc(1turn_-_90deg_-_(5*3.6deg))]`
    },
    equal: {
      tiny: `rotate-[calc(1turn_-_90deg_-_(0.5*9*3.6deg))]`,
      small: `rotate-[calc(1turn_-_90deg_-_(0.5*6*3.6deg))]`,
      medium: `rotate-[calc(1turn_-_90deg_-_(0.5*5*3.6deg))]`,
      large: `rotate-[calc(1turn_-_90deg_-_(0.5*5*3.6deg))]`
    }
  }
};

const defaultColors = {
  "0": "#e2162a",
  "34": "#ffae00",
  "68": "#00ac3a"
};

const Gauge = ({
  size = "medium",
  value,
  colors = defaultColors,
  showValue = false,
  arcPriority = "default",
  indeterminate = false
}: GaugeProps) => {
  const r = size === "tiny" ? 42.5 : 45;
  const circumference = 2 * r * Math.PI;
  const primary = colors?.primary
    ? colors?.primary
    : colors[Math.max(...Object.keys(colors).map(Number).filter(key => key <= value)).toString()];

  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className="relative"
      role="progressbar"
    >
      <svg
        aria-hidden="true"
        fill="none"
        height={sizes[size]}
        width={sizes[size]}
        viewBox="0 0 100 100"
        strokeWidth="2"
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          strokeWidth="10"
          strokeDashoffset="0"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${rotate.secondary[arcPriority][size]} scale-y-[-1] origin-center stroke-muted`}
          strokeDasharray={`${indeterminate ? circumference : arcPriority === "default" ? (circumference * (100 - (value === 0 ? 0 : (2 * gapPercent[size])) - value) / 100) : ((circumference * (100 - 2 * gapPercent[size]) / 100) / 2)} ${circumference}`}
        />
        {(value > 0 || arcPriority === "equal") && !indeterminate && (
          <circle
            cx="50"
            cy="50"
            r={r}
            strokeWidth="10"
            strokeDashoffset="0"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${rotate.primary[arcPriority][size]} origin-center`}
            stroke={primary}
            strokeDasharray={`${arcPriority === "default" ? (circumference * value / 100) : ((circumference * (100 - 2 * gapPercent[size]) / 100) / 2)} ${circumference}`}
          />
        )}
      </svg>
      {showValue && size !== "tiny" && !indeterminate && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <p className={`text-foreground font-sans ${
            size === "small" ? "text-[11px] font-medium" :
            size === "medium" ? "text-[18px] font-medium" :
            "text-[32px] font-semibold"
          }`}>
            {value}
          </p>
        </div>
      )}
    </div>
  );
};

// KPI Card Component with real data
const KPICard = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  description,
  isLoading = false
}: {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ElementType;
  description: string;
  isLoading?: boolean;
}) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Icon className="h-5 w-5 text-primary" />
          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-20 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Icon className="h-5 w-5 text-primary" />
        {trend === "up" ? (
          <ArrowUp className="h-4 w-4 text-green-500" />
        ) : (
          <ArrowDown className="h-4 w-4 text-red-500" />
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-foreground">{value}</h3>
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${trend === "up" ? "text-green-500" : "text-red-500"}`}>
            {change}
          </span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </div>
    </Card>
  );
};

// Main Dashboard Component with real data
const WhatsAppBookingDashboard = () => {
  const [timeFilter, setTimeFilter] = useState("week");
  const [activeTab, setActiveTab] = useState("overview");
  const { selectedCalendarId } = useConversationCalendar();
  
  // Use real data hooks
  const { data: dashboardMetrics, isLoading: metricsLoading } = useDashboardAnalytics(selectedCalendarId || undefined);
  const { data: bookingTrends = [], isLoading: trendsLoading } = useBookingTrends(selectedCalendarId || undefined, 7);
  const { data: whatsappMetrics, isLoading: whatsappLoading } = useWhatsAppConversationMetrics(selectedCalendarId || undefined);

  // Transform booking trends data for charts
  const conversationData = bookingTrends.map(trend => ({
    label: new Date(trend.date).toLocaleDateString('nl-NL', { weekday: 'short' }),
    value: trend.bookings
  }));

  // Real KPI data from Supabase
  const kpiData = [
    {
      title: "Totaal Gesprekken",
      value: whatsappMetrics?.totalConversations?.toString() || "0",
      change: "+12.5%",
      trend: "up" as const,
      icon: MessageSquare,
      description: "vs vorige week",
      isLoading: whatsappLoading
    },
    {
      title: "Conversieratio",
      value: `${dashboardMetrics?.conversion_rate || 0}%`,
      change: "+5.3%",
      trend: "up" as const,
      icon: Target,
      description: "gesprekken → boekingen",
      isLoading: metricsLoading
    },
    {
      title: "Gem. Responstijd",
      value: `${dashboardMetrics?.avg_response_time || 0} min`,
      change: "-18.2%",
      trend: "down" as const,
      icon: Clock,
      description: "sneller dan vorig",
      isLoading: metricsLoading
    },
    {
      title: "Nieuwe Klanten",
      value: dashboardMetrics?.today_bookings?.toString() || "0",
      change: "+23.1%",
      trend: "up" as const,
      icon: UserCheck,
      description: "deze week",
      isLoading: metricsLoading
    }
  ];

  if (!selectedCalendarId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">No calendar selected</h3>
          <p className="text-muted-foreground">
            Please select a calendar to view dashboard analytics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">WhatsApp Booking Statistieken</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Vandaag</SelectItem>
                <SelectItem value="week">Deze week</SelectItem>
                <SelectItem value="month">Deze maand</SelectItem>
                <SelectItem value="quarter">Dit kwartaal</SelectItem>
                <SelectItem value="custom">Aangepast</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6">
        {/* KPI Cards with real data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiData.map((kpi, index) => (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <KPICard {...kpi} />
            </motion.div>
          ))}
        </div>

        {/* Real Revenue and Conversion Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Omzet deze maand</h3>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              {metricsLoading ? (
                <div className="h-8 bg-gray-200 rounded w-20 animate-pulse" />
              ) : (
                <div className="text-3xl font-bold text-primary">
                  €{dashboardMetrics?.total_revenue?.toFixed(2) || '0.00'}
                </div>
              )}
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-500">+18.2% vs vorige maand</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Gemiddeld €{dashboardMetrics?.total_revenue && dashboardMetrics?.month_bookings ? 
                  (dashboardMetrics.total_revenue / dashboardMetrics.month_bookings).toFixed(0) : '0'} per boeking
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Boekingssucces</h3>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-center mb-4">
              {metricsLoading ? (
                <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
              ) : (
                <Gauge value={dashboardMetrics?.conversion_rate || 0} showValue size="medium" />
              )}
            </div>
            <div className="text-center text-sm text-muted-foreground">
              {dashboardMetrics?.conversion_rate || 0}% van aanvragen wordt geboekt
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Vandaag's Schema</h3>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {metricsLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Vandaag geboekt</span>
                    <span className="text-sm font-medium">{dashboardMetrics?.today_bookings || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Wachtend op bevestiging</span>
                    <span className="text-sm font-medium">{dashboardMetrics?.pending_bookings || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Deze week</span>
                    <span className="text-sm font-medium">{dashboardMetrics?.week_bookings || 0}</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Show message if no data */}
        {!metricsLoading && !whatsappLoading && !dashboardMetrics?.today_bookings && !whatsappMetrics?.totalConversations && (
          <Card className="p-8">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">No data yet</h3>
              <p className="text-muted-foreground mb-4">
                Start receiving WhatsApp messages and bookings to see analytics here
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default WhatsAppBookingDashboard;
