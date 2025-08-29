import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Info, CheckCircle, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaxComplianceSettingsProps {
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  className?: string;
}

export const TaxComplianceSettings: React.FC<TaxComplianceSettingsProps> = ({
  enabled = true,
  onToggle,
  className = ''
}) => {
  return (
    <TooltipProvider>
      <Card className={`bg-slate-800/50 border-slate-700/50 ${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-400" />
              <CardTitle className="text-white">VAT Compliance & Administration</CardTitle>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              Professional
            </Badge>
          </div>
          <CardDescription className="text-slate-400">
            Automatic VAT calculation and compliance for Dutch businesses
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">Automatic VAT calculation</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-slate-500 hover:text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    Stripe Tax automatically calculates the correct VAT rates for all your bookings 
                    according to Dutch tax legislation
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch 
              checked={enabled}
              onCheckedChange={onToggle}
              disabled={!onToggle}
            />
          </div>
          
          {enabled && (
            <div className="space-y-3 pt-3 border-t border-slate-700">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">21% VAT for business services</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">Automatic VAT administration</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">Compliance with Dutch legislation</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">VAT reports and analytics</span>
              </div>
            </div>
          )}
          
          <div className="text-xs text-slate-500 bg-slate-900/50 p-3 rounded border border-slate-700/50">
            <strong>Benefits for your business:</strong>
            <br />
            • No more manual VAT calculations needed
            <br />
            • Automatic compliance with tax regulations
            <br />
            • Save time on administration
            <br />
            • Reduces risk of errors in VAT returns
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};