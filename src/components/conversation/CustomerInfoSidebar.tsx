
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface CustomerInfo {
  customer: string;
  email: string;
  phone: string;
  lastActivity: Date;
}

interface Message {
  id: number;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  status: 'delivered' | 'read';
}

interface CustomerInfoSidebarProps {
  customerInfo: CustomerInfo;
  messages: Message[];
}

export const CustomerInfoSidebar: React.FC<CustomerInfoSidebarProps> = ({ 
  customerInfo, 
  messages 
}) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Klant Informatie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-white">{customerInfo.customer}</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-gray-300">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-sm">{customerInfo.email}</span>
          </div>
          
          <div className="flex items-center gap-3 text-gray-300">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-sm">{customerInfo.phone}</span>
          </div>
          
          <div className="flex items-center gap-3 text-gray-300">
            <Clock className="h-4 w-4 text-gray-400" />
            <div className="text-sm">
              <p>Laatste activiteit:</p>
              <p className="text-gray-400">
                {format(customerInfo.lastActivity, "PPP 'om' HH:mm", { locale: nl })}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <h4 className="font-medium text-white mb-2">Gesprek Statistieken</h4>
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex justify-between">
              <span>Totaal berichten:</span>
              <span>{messages.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Klant berichten:</span>
              <span>{messages.filter(m => m.type === 'user').length}</span>
            </div>
            <div className="flex justify-between">
              <span>AI berichten:</span>
              <span>{messages.filter(m => m.type === 'bot').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Duur gesprek:</span>
              <span>3 min</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
