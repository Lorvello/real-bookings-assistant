
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Calendar, Activity } from 'lucide-react';

interface LiveOperationsContentProps {
  data: any;
  calendarIds: string[];
}

export function LiveOperationsContent({ data, calendarIds }: LiveOperationsContentProps) {
  return (
    <div className="space-y-6">
      {/* Real-time metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Today's Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {data?.today_bookings || 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Bookings scheduled today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {data?.today_pending || 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Confirmed</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {data?.today_confirmed || 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ready for today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {data?.currently_active_bookings || 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              In progress
            </p>
          </CardContent>
        </Card>
      </div>

      {calendarIds.length > 1 && (
        <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Activity className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">Multiple Calendar Live Operations</h3>
                <p className="text-sm text-slate-400">
                  Currently showing live data from the primary calendar. Full multi-calendar aggregation coming soon.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
