
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';

export const TodaysScheduleCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-green-600" />
          Today's Schedule
          <Badge variant="outline" className="ml-auto">
            0 appointments
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">No appointments today</p>
          <p className="text-sm">Your schedule is free for today</p>
        </div>
      </CardContent>
    </Card>
  );
};
