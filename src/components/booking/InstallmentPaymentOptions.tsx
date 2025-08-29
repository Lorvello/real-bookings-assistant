import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, MessageCircle } from 'lucide-react';
import { ServiceType } from '@/types/database';

interface InstallmentPlan {
  type: 'preset' | 'custom';
  preset?: '100_at_booking' | '50_50' | '25_25_50' | 'fixed_deposit';
  deposits?: Array<{
    percentage?: number;
    amount?: number;
    timing: 'now' | 'appointment' | 'hours_after';
    hours?: number;
  }>;
  fixed_deposit_amount?: number;
}

interface PaymentScheduleItem {
  amount: number;
  timing: 'now' | 'appointment' | 'hours_after';
  description: string;
  paymentMethod: 'online' | 'cash';
  dueDate?: string;
}

interface InstallmentPaymentOptionsProps {
  serviceType: ServiceType;
  installmentPlan: InstallmentPlan;
  onPaymentTypeChange: (type: 'full' | 'installments') => void;
  selectedPaymentType: 'full' | 'installments';
  appointmentDate?: Date;
}

export function InstallmentPaymentOptions({
  serviceType,
  installmentPlan,
  onPaymentTypeChange,
  selectedPaymentType,
  appointmentDate
}: InstallmentPaymentOptionsProps) {
  const servicePrice = serviceType.price || 0;

  const calculatePaymentSchedule = (): PaymentScheduleItem[] => {
    const schedule: PaymentScheduleItem[] = [];
    
    if (installmentPlan.type === 'preset') {
      if (installmentPlan.preset === '100_at_booking') {
        // 100% at booking - single payment
        schedule.push({
          amount: servicePrice,
          timing: 'now',
          description: 'Full payment (due now)',
          paymentMethod: 'online'
        });
      } else if (installmentPlan.preset === 'fixed_deposit') {
        const depositAmount = installmentPlan.fixed_deposit_amount || 50;
        const remainderAmount = servicePrice - depositAmount;
        
        schedule.push({
          amount: depositAmount,
          timing: 'now',
          description: 'Deposit (due now)',
          paymentMethod: 'online'
        });
        
        schedule.push({
          amount: remainderAmount,
          timing: 'appointment',
          description: 'Remainder (at appointment)',
          paymentMethod: 'cash',
          dueDate: appointmentDate?.toLocaleDateString()
        });
      } else {
        // Handle 50/50 and 25/25/50 presets
        installmentPlan.deposits?.forEach((deposit, index) => {
          const amount = Math.round((servicePrice * (deposit.percentage || 0)) / 100);
          const isFirst = index === 0;
          
          schedule.push({
            amount,
            timing: deposit.timing,
            description: isFirst ? 
              `Payment ${index + 1} (due now)` : 
              `Payment ${index + 1} (${deposit.timing === 'appointment' ? 'at appointment' : 'after booking'})`,
            paymentMethod: deposit.timing === 'now' ? 'online' : 'cash',
            dueDate: deposit.timing === 'appointment' ? appointmentDate?.toLocaleDateString() : undefined
          });
        });
      }
    } else {
      // Custom plan
      installmentPlan.deposits?.forEach((deposit, index) => {
        const amount = deposit.amount || Math.round((servicePrice * (deposit.percentage || 0)) / 100);
        const isFirst = index === 0;
        
        let dueDate: string | undefined;
        if (deposit.timing === 'appointment') {
          dueDate = appointmentDate?.toLocaleDateString();
        } else if (deposit.timing === 'hours_after' && appointmentDate && deposit.hours) {
          const futureDate = new Date(appointmentDate);
          futureDate.setHours(futureDate.getHours() + deposit.hours);
          dueDate = futureDate.toLocaleDateString();
        }
        
        schedule.push({
          amount,
          timing: deposit.timing,
          description: isFirst ? 
            `Payment ${index + 1} (due now)` : 
            `Payment ${index + 1} (${deposit.timing === 'appointment' ? 'at appointment' : `${deposit.hours} hours after`})`,
          paymentMethod: deposit.timing === 'now' ? 'online' : 'cash',
          dueDate
        });
      });
    }
    
    return schedule;
  };

  const paymentSchedule = calculatePaymentSchedule();
  const totalScheduledAmount = paymentSchedule.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-4">
      <RadioGroup value={selectedPaymentType} onValueChange={onPaymentTypeChange}>
        {/* Full Payment Option */}
        <Card className={`cursor-pointer transition-colors ${selectedPaymentType === 'full' ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full" className="flex items-center gap-2 cursor-pointer">
                <CreditCard className="h-4 w-4" />
                Pay Full Amount Now
              </Label>
              <Badge variant="outline">€{servicePrice.toFixed(2)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Complete payment immediately via secure online checkout.
            </p>
          </CardContent>
        </Card>

        {/* Installment Payment Option */}
        <Card className={`cursor-pointer transition-colors ${selectedPaymentType === 'installments' ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="installments" id="installments" />
              <Label htmlFor="installments" className="flex items-center gap-2 cursor-pointer">
                <Calendar className="h-4 w-4" />
                Pay in Installments
              </Label>
              <Badge variant="outline">{paymentSchedule.length} payments</Badge>
            </div>
          </CardHeader>
          
          {selectedPaymentType === 'installments' && (
            <CardContent className="pt-0 space-y-3">
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Payment Schedule</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  We'll send payment links via WhatsApp. No cards are stored.
                </p>
                
                <div className="space-y-2">
                  {paymentSchedule.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {payment.paymentMethod === 'online' ? (
                          <CreditCard className="h-3 w-3 text-primary" />
                        ) : (
                          <span className="h-3 w-3 rounded-full bg-muted-foreground" />
                        )}
                        <span>{payment.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={payment.paymentMethod === 'online' ? 'default' : 'secondary'} className="text-xs">
                          €{payment.amount.toFixed(2)}
                        </Badge>
                        {payment.paymentMethod === 'online' && (
                          <Badge variant="outline" className="text-xs">link</Badge>
                        )}
                        {payment.paymentMethod === 'cash' && (
                          <Badge variant="outline" className="text-xs">cash</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-2 mt-2 border-t text-sm font-medium">
                  <span>Total:</span>
                  <span>€{totalScheduledAmount.toFixed(2)}</span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Online payments are processed securely via Stripe. Cash payments can be made at your appointment.
              </p>
            </CardContent>
          )}
        </Card>
      </RadioGroup>
    </div>
  );
}