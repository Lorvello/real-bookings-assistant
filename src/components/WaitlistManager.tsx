import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Mail, User, Calendar, Trash2 } from 'lucide-react';
import { useWaitlist } from '@/hooks/useWaitlist';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface WaitlistManagerProps {
  calendarId: string;
}

export function WaitlistManager({ calendarId }: WaitlistManagerProps) {
  const { waitlistEntries, loading, removeFromWaitlist, updateWaitlistStatus } = useWaitlist(calendarId);
  const { serviceTypes } = useServiceTypes();

  const getServiceTypeName = (serviceTypeId: string) => {
    const service = serviceTypes.find(s => s.id === serviceTypeId);
    return service?.name || 'Onbekende service';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'notified': return 'bg-blue-100 text-blue-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Wachtend';
      case 'notified': return 'Genotificeerd';
      case 'converted': return 'Geconverteerd';
      case 'expired': return 'Verlopen';
      default: return status;
    }
  };

  const getFlexibilityText = (flexibility: string) => {
    switch (flexibility) {
      case 'specific': return 'Specifieke tijd';
      case 'morning': return 'Ochtend';
      case 'afternoon': return 'Middag';
      case 'anytime': return 'Altijd';
      default: return flexibility;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 bg-primary rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Wachtlijst Beheer</h2>
        <p className="text-muted-foreground mt-2">
          Beheer klanten die op de wachtlijst staan voor je services
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Wachtlijst Entries ({waitlistEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {waitlistEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Geen wachtlijst entries gevonden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Klant</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Gewenste Datum</TableHead>
                  <TableHead>Tijdvoorkeur</TableHead>
                  <TableHead>Flexibiliteit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Toegevoegd</TableHead>
                  <TableHead>Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlistEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{entry.customer_name}</div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {entry.customer_email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getServiceTypeName(entry.service_type_id)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                        {format(new Date(entry.preferred_date), 'dd MMM yyyy', { locale: nl })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.preferred_time_start && entry.preferred_time_end ? (
                        <span>{entry.preferred_time_start} - {entry.preferred_time_end}</span>
                      ) : (
                        <span className="text-muted-foreground">Geen voorkeur</span>
                      )}
                    </TableCell>
                    <TableCell>{getFlexibilityText(entry.flexibility)}</TableCell>
                    <TableCell>
                      <Select
                        value={entry.status}
                        onValueChange={(value) => updateWaitlistStatus(entry.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue>
                            <Badge className={getStatusColor(entry.status)}>
                              {getStatusText(entry.status)}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="waiting">Wachtend</SelectItem>
                          <SelectItem value="notified">Genotificeerd</SelectItem>
                          <SelectItem value="expired">Verlopen</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: nl })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromWaitlist(entry.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
