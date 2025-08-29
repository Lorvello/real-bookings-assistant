import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaxDisplayProps {
  subtotal: number;
  taxAmount?: number;
  total: number;
  currency?: string;
  className?: string;
}

export const TaxDisplay: React.FC<TaxDisplayProps> = ({
  subtotal,
  taxAmount,
  total,
  currency = '€',
  className = ''
}) => {
  const hasValidTax = taxAmount !== undefined && taxAmount > 0;
  const taxRate = hasValidTax ? (taxAmount / subtotal * 100) : 21; // Default to 21% Dutch VAT

  return (
    <TooltipProvider>
      <Card className={`bg-slate-800/50 border-slate-700/50 ${className}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Subtotal</span>
            <span className="text-white">{currency}{subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <span className="text-slate-400">BTW ({taxRate.toFixed(0)}%)</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-slate-500 hover:text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    Nederlandse BTW wordt automatisch berekend volgens de geldende belastingtarieven. 
                    Voor zakelijke diensten geldt het standaardtarief van 21%.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-white">
              {currency}{hasValidTax ? taxAmount.toFixed(2) : (subtotal * 0.21).toFixed(2)}
            </span>
          </div>
          
          <hr className="border-slate-700" />
          
          <div className="flex items-center justify-between font-semibold">
            <span className="text-white">Totaal (incl. BTW)</span>
            <span className="text-emerald-400 text-lg">
              {currency}{total.toFixed(2)}
            </span>
          </div>
          
          <div className="text-xs text-slate-500 mt-2">
            BTW wordt automatisch berekend en geadministreerd conform Nederlandse belastingwetgeving
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};