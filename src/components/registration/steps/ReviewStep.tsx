
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Mail, Clock, Briefcase, User } from 'lucide-react';

interface ReviewStepProps {
  data: any;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ data }) => {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}u`;
    return `${hours}u ${remainingMinutes}min`;
  };

  const getWorkingDays = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const keys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    return keys
      .filter(key => data.availability[key] !== null)
      .map(key => {
        const dayIndex = keys.indexOf(key);
        const dayName = days[dayIndex];
        const hours = data.availability[key];
        return { name: dayName, hours };
      });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Review Your Details
        </h3>
        <p className="text-gray-600">
          Review all entered information before creating your account
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <User className="w-5 h-5" />
              <span>Account Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{data.fullName}</p>
              <p className="text-sm text-gray-600">{data.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Business Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Briefcase className="w-5 h-5" />
              <span>Business Info</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{data.businessName}</p>
              <p className="text-sm text-gray-600">{data.businessType}</p>
            </div>
            <div className="flex items-start space-x-2">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
              <p className="text-sm text-gray-600">{data.businessEmail}</p>
            </div>
            {data.businessAddress.street && (
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p>{data.businessAddress.street} {data.businessAddress.number}</p>
                  <p>{data.businessAddress.postal} {data.businessAddress.city}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Types */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Service Types</CardTitle>
            <CardDescription>
              {data.serviceTypes.length} service{data.serviceTypes.length !== 1 ? 's' : ''} added
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.serviceTypes.map((service: any, index: number) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{service.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDuration(service.duration)}
                    </Badge>
                    {service.price && (
                      <Badge variant="secondary" className="text-xs">
                        €{service.price.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-xs text-gray-600 mt-2">{service.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Availability</CardTitle>
            <CardDescription>
              Your default opening hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getWorkingDays().map((day, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-900 capitalize mb-1">{day.name}</p>
                  <p className="text-sm text-gray-600">
                    {day.hours.start} - {day.hours.end}
                  </p>
                </div>
              ))}
            </div>
            {getWorkingDays().length === 0 && (
              <p className="text-gray-500 text-center py-4">No opening hours set</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          <strong>All set!</strong> Your account will be created with all the information above. 
          You can adjust everything later in your account settings.
        </p>
      </div>
    </div>
  );
};
