import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTeamMemberServices } from '@/hooks/useTeamMemberServices';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface TeamMemberServiceManagerProps {
  calendarId: string;
  teamMemberId: string;
  teamMemberName: string;
}

export const TeamMemberServiceManager = ({ 
  calendarId, 
  teamMemberId, 
  teamMemberName 
}: TeamMemberServiceManagerProps) => {
  const { t } = useTranslation('notifications');
  const { toast } = useToast();
  const [updating, setUpdating] = useState<string | null>(null);
  
  const { services: assignedServices, assignService, unassignService, loading: servicesLoading } = 
    useTeamMemberServices(calendarId, teamMemberId);
  
  const { serviceTypes, loading: typesLoading } = useServiceTypes(calendarId, false);

  const isServiceAssigned = (serviceTypeId: string) => {
    return assignedServices.some(s => s.service_type_id === serviceTypeId);
  };

  const handleToggle = async (serviceTypeId: string, serviceName: string) => {
    const isAssigned = isServiceAssigned(serviceTypeId);
    
    try {
      setUpdating(serviceTypeId);
      
      if (isAssigned) {
        const assignment = assignedServices.find(s => s.service_type_id === serviceTypeId);
        if (assignment) {
          await unassignService(assignment.id);
          toast({
            title: t('teamMemberServiceManager.serviceRemovedTitle', 'Service removed'),
            description: t('teamMemberServiceManager.serviceRemovedDescription', '{{serviceName}} has been removed from {{teamMemberName}}', { serviceName, teamMemberName }),
          });
        }
      } else {
        await assignService(teamMemberId, serviceTypeId, calendarId);
        toast({
          title: t('teamMemberServiceManager.serviceAssignedTitle', 'Service assigned'),
          description: t('teamMemberServiceManager.serviceAssignedDescription', '{{serviceName}} has been assigned to {{teamMemberName}}', { serviceName, teamMemberName }),
        });
      }
    } catch (error) {
      console.error('Error toggling service:', error);
      toast({
        title: t('teamMemberServiceManager.errorTitle', 'Error'),
        description: t('teamMemberServiceManager.errorDescription', 'Could not update service assignment'),
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  if (typesLoading || servicesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('teamMemberServiceManager.cardTitle', 'Services for {{teamMemberName}}', { teamMemberName })}</CardTitle>
        <CardDescription>
          {t('teamMemberServiceManager.cardDescription', 'Select which services {{teamMemberName}} can perform', { teamMemberName })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {serviceTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('teamMemberServiceManager.noServices', 'No services available for this calendar')}
          </p>
        ) : (
          <div className="space-y-3">
            {serviceTypes.map(service => (
              <div 
                key={service.id} 
                className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  id={`service-${service.id}`}
                  checked={isServiceAssigned(service.id)}
                  onCheckedChange={() => handleToggle(service.id, service.name)}
                  disabled={updating === service.id}
                />
                <Label 
                  htmlFor={`service-${service.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{service.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {service.price ? `€${service.price}` : t('teamMemberServiceManager.freeLabel', 'Free')} · {service.duration} min
                    </span>
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {service.description}
                    </p>
                  )}
                </Label>
                {updating === service.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
