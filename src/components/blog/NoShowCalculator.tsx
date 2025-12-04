import React, { useState, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NoShowCalculator: React.FC = () => {
  const [appointments, setAppointments] = useState(200);
  const [noShowRate, setNoShowRate] = useState(15);
  const [servicePrice, setServicePrice] = useState(85);

  const calculations = useMemo(() => {
    const monthlyLoss = appointments * (noShowRate / 100) * servicePrice;
    const annualLoss = monthlyLoss * 12;
    const potentialSavings = annualLoss * 0.5;
    return { monthlyLoss, annualLoss, potentialSavings };
  }, [appointments, noShowRate, servicePrice]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-primary/20 rounded-2xl p-6 md:p-8 my-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/20 rounded-lg">
          <Calculator className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">No-Show Revenue Calculator</h3>
          <p className="text-muted-foreground text-sm">Calculate your hidden losses</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Monthly Appointments */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-foreground">Monthly Appointments</label>
            <span className="text-lg font-bold text-primary">{appointments}</span>
          </div>
          <Slider
            value={[appointments]}
            onValueChange={(value) => setAppointments(value[0])}
            min={50}
            max={500}
            step={10}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50</span>
            <span>500</span>
          </div>
        </div>

        {/* No-Show Rate */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-foreground">No-Show Rate</label>
            <span className="text-lg font-bold text-primary">{noShowRate}%</span>
          </div>
          <Slider
            value={[noShowRate]}
            onValueChange={(value) => setNoShowRate(value[0])}
            min={5}
            max={40}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5%</span>
            <span>40%</span>
          </div>
        </div>

        {/* Average Service Price */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-foreground">Avg. Service Price</label>
            <span className="text-lg font-bold text-primary">€{servicePrice}</span>
          </div>
          <Slider
            value={[servicePrice]}
            onValueChange={(value) => setServicePrice(value[0])}
            min={20}
            max={200}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>€20</span>
            <span>€200</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-300">Monthly Loss</span>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-red-400">
            {formatCurrency(calculations.monthlyLoss)}
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-300">Annual Loss</span>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-red-400">
            {formatCurrency(calculations.annualLoss)}
          </div>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary/80">Potential Savings</span>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-primary">
            {formatCurrency(calculations.potentialSavings)}
          </div>
          <span className="text-xs text-muted-foreground">with 50% reduction</span>
        </div>
      </div>

      <div className="text-center">
        <Link to="/contact">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            See How We Can Help Recover This Revenue →
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NoShowCalculator;
