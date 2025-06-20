
"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Menu,
  X,
  Home,
  Settings,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Gauge Component Implementation
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

// KPI Card Component
const KPICard = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  description 
}: {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ElementType;
  description: string;
}) => {
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

// Chart Component (Simplified)
const SimpleChart = ({ data, type = "bar" }: { data: any[]; type?: "bar" | "line" | "pie" }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  if (type === "pie") {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="relative w-32 h-32">
          {data.map((item, index) => (
            <div
              key={index}
              className="absolute inset-0 rounded-full border-8"
              style={{
                borderColor: `hsl(${(index * 360) / data.length}, 70%, 50%)`,
                transform: `rotate(${(index * 360) / data.length}deg)`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-48 flex items-end justify-between gap-2 p-4">
      {data.map((item, index) => (
        <div key={index} className="flex flex-col items-center gap-2">
          <div
            className="bg-primary rounded-t"
            style={{
              height: `${(item.value / maxValue) * 120}px`,
              width: "20px",
            }}
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// Main Dashboard Component
const WhatsAppBookingDashboard = () => {
  const [timeFilter, setTimeFilter] = useState("week");
  const [activeTab, setActiveTab] = useState("overview");

  const kpiData = [
    {
      title: "Totaal Gesprekken",
      value: "2,847",
      change: "+12.5%",
      trend: "up" as const,
      icon: MessageSquare,
      description: "vs vorige week"
    },
    {
      title: "Conversieratio",
      value: "68.2%",
      change: "+5.3%",
      trend: "up" as const,
      icon: Target,
      description: "gesprekken → boekingen"
    },
    {
      title: "Gem. Responstijd",
      value: "2.4 min",
      change: "-18.2%",
      trend: "down" as const,
      icon: Clock,
      description: "sneller dan vorig"
    },
    {
      title: "Nieuwe Klanten",
      value: "156",
      change: "+23.1%",
      trend: "up" as const,
      icon: UserCheck,
      description: "deze week"
    }
  ];

  const conversationData = [
    { label: "Ma", value: 45 },
    { label: "Di", value: 52 },
    { label: "Wo", value: 38 },
    { label: "Do", value: 61 },
    { label: "Vr", value: 55 },
    { label: "Za", value: 28 },
    { label: "Zo", value: 22 }
  ];

  const customerTypeData = [
    { label: "Nieuwe klanten", value: 156 },
    { label: "Terugkerende klanten", value: 89 },
    { label: "VIP klanten", value: 23 }
  ];

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
        {/* KPI Cards */}
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overzicht</TabsTrigger>
            <TabsTrigger value="conversations">Gesprekken</TabsTrigger>
            <TabsTrigger value="customers">Klanten</TabsTrigger>
            <TabsTrigger value="performance">Prestaties</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conversation Trends */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Gesprekstrends</h3>
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
                <SimpleChart data={conversationData} type="bar" />
              </Card>

              {/* Conversion Rate */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Conversieratio</h3>
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-center">
                  <Gauge value={68} showValue size="large" />
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  68% van gesprekken leidt tot boeking
                </p>
              </Card>
            </div>

            {/* Additional Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Revenue Stats */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Omzet deze maand</h3>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-primary">€24,847</div>
                  <div className="flex items-center gap-2">
                    <ArrowUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">+18.2% vs vorige maand</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Gemiddeld €156 per boeking</div>
                </div>
              </Card>

              {/* Booking Success Rate */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Boekingssucces</h3>
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-center mb-4">
                  <Gauge value={85} showValue size="medium" />
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  85% van aanvragen wordt geboekt
                </div>
              </Card>

              {/* Peak Hours */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Drukste uren</h3>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">10:00 - 12:00</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: "85%" }}></div>
                      </div>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">14:00 - 16:00</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: "72%" }}></div>
                      </div>
                      <span className="text-sm font-medium">72%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">19:00 - 21:00</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: "58%" }}></div>
                      </div>
                      <span className="text-sm font-medium">58%</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Second Row of Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Message Volume */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <ArrowUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">8,247</h3>
                  <p className="text-sm text-muted-foreground">Berichten verzonden</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-500">+24.1%</span>
                    <span className="text-xs text-muted-foreground">deze week</span>
                  </div>
                </div>
              </Card>

              {/* Average Session */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <ArrowUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">7.2 min</h3>
                  <p className="text-sm text-muted-foreground">Gem. gespreksduur</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-500">+8.3%</span>
                    <span className="text-xs text-muted-foreground">vs vorige week</span>
                  </div>
                </div>
              </Card>

              {/* Repeat Customers */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <ArrowUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">34%</h3>
                  <p className="text-sm text-muted-foreground">Terugkerende klanten</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-500">+5.7%</span>
                    <span className="text-xs text-muted-foreground">loyaliteit stijgt</span>
                  </div>
                </div>
              </Card>

              {/* Satisfaction Score */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <ArrowUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">4.8/5</h3>
                  <p className="text-sm text-muted-foreground">Klanttevredenheid</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-500">+0.3</span>
                    <span className="text-xs text-muted-foreground">deze maand</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Third Row - Weekly Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Weekprestaties</h3>
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-4">
                  {[
                    { day: "Maandag", bookings: 45, revenue: "€2,847" },
                    { day: "Dinsdag", bookings: 52, revenue: "€3,284" },
                    { day: "Woensdag", bookings: 38, revenue: "€2,394" },
                    { day: "Donderdag", bookings: 61, revenue: "€3,847" },
                    { day: "Vrijdag", bookings: 55, revenue: "€3,465" },
                    { day: "Zaterdag", bookings: 28, revenue: "€1,764" },
                    { day: "Zondag", bookings: 22, revenue: "€1,386" }
                  ].map((item, index) => (
                    <div key={item.day} className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50">
                      <span className="text-sm font-medium">{item.day}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{item.bookings} boekingen</span>
                        <span className="text-sm font-semibold">{item.revenue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Kanaal Performance</h3>
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">WhatsApp Business</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">89.2%</div>
                      <div className="text-xs text-muted-foreground">2,547 gesprekken</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">WhatsApp Web</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">8.7%</div>
                      <div className="text-xs text-muted-foreground">248 gesprekken</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="font-medium">API Integratie</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">2.1%</div>
                      <div className="text-xs text-muted-foreground">52 gesprekken</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conversations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Inkomende vs Uitgaande</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Inkomend</span>
                    <span className="font-semibold">1,847</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "75%" }}></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Uitgaand</span>
                    <span className="font-semibold">612</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-secondary h-2 rounded-full" style={{ width: "25%" }}></div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Gemiddelde Responstijd</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">2.4</div>
                  <div className="text-sm text-muted-foreground">minuten</div>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <ArrowDown className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">18.2% sneller</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Piekuren</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">10:00 - 11:00</span>
                    <span className="font-semibold">89 gesprekken</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">14:00 - 15:00</span>
                    <span className="font-semibold">76 gesprekken</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">16:00 - 17:00</span>
                    <span className="font-semibold">71 gesprekken</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Klantsegmentatie</h3>
                <SimpleChart data={customerTypeData} type="pie" />
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Klantgedrag</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-green-500" />
                      <span>Snelle Boekers</span>
                    </div>
                    <span className="font-semibold">45%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      <span>Twijfelaars</span>
                    </div>
                    <span className="font-semibold">32%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <UserX className="h-5 w-5 text-red-500" />
                      <span>No-shows</span>
                    </div>
                    <span className="font-semibold">8%</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Boekingen per Week</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">247</div>
                  <div className="text-sm text-muted-foreground">boekingen</div>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <ArrowUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">+15.3%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">No-show Percentage</h3>
                <div className="text-center">
                  <Gauge value={8} showValue size="medium" colors={{ "0": "#00ac3a", "10": "#ffae00", "20": "#e2162a" }} />
                  <p className="text-sm text-muted-foreground mt-2">Laag no-show percentage</p>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Klanttevredenheid</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">4.8</div>
                  <div className="text-sm text-muted-foreground">van 5 sterren</div>
                  <div className="mt-4 flex justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <div
                        key={star}
                        className={`w-4 h-4 ${star <= 4 ? "text-yellow-400" : "text-muted"}`}
                      >
                        ⭐
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default WhatsAppBookingDashboard;
