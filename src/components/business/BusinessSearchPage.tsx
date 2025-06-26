
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { BusinessOverviewCard } from './BusinessOverviewCard';
import { useBusinessAvailabilityOverview } from '@/hooks/useBusinessAvailabilityOverview';

export const BusinessSearchPage: React.FC = () => {
  const { data, loading, fetchBusinessOverview, refreshOverview } = useBusinessAvailabilityOverview();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Laad initial data
    fetchBusinessOverview();
  }, []);

  const handleSearch = () => {
    const filters: any = {};
    
    if (searchTerm.trim()) {
      filters.business_name = searchTerm.trim();
    }
    if (selectedType) {
      filters.business_type = selectedType;
    }
    if (selectedCity.trim()) {
      filters.city = selectedCity.trim();
    }

    fetchBusinessOverview(filters);
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedType('');
    setSelectedCity('');
    fetchBusinessOverview();
  };

  const handleViewSlots = (calendarSlug: string) => {
    // Hier kun je navigeren naar een slots pagina of modal openen
    console.log('View slots for calendar:', calendarSlug);
    // Bijvoorbeeld: navigate(`/calendar/${calendarSlug}/slots`);
  };

  const businessTypes = [
    { value: 'salon', label: 'Kapsalon' },
    { value: 'clinic', label: 'Kliniek' },
    { value: 'consultant', label: 'Consultant' },
    { value: 'trainer', label: 'Trainer' },
    { value: 'other', label: 'Overig' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bedrijven zoeken</h1>
          <p className="text-muted-foreground">
            Zoek naar bedrijven en bekijk hun beschikbaarheid
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refreshOverview}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Ververs
        </Button>
      </div>

      {/* Zoek sectie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Zoeken
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Zoek op bedrijfsnaam..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              Zoeken
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-2 block">Type bedrijf</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle types</SelectItem>
                    {businessTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Stad</label>
                <Input
                  placeholder="Zoek op stad..."
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={handleReset} className="w-full">
                  Reset filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultaten */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Resultaten ({data.length})
          </h2>
          {loading && (
            <div className="text-sm text-muted-foreground">
              Laden...
            </div>
          )}
        </div>

        {data.length === 0 && !loading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Geen bedrijven gevonden. Probeer andere zoektermen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.map((business) => (
              <BusinessOverviewCard
                key={`${business.calendar_id}-${business.service_type_id || 'no-service'}`}
                business={business}
                onViewSlots={handleViewSlots}
                showFullDetails={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
