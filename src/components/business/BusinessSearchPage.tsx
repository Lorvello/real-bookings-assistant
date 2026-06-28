
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { BusinessOverviewCard } from './BusinessOverviewCard';
import { useBusinessAvailabilityOverview } from '@/hooks/useBusinessAvailabilityOverview';
import { BusinessOverviewFilters } from '@/types/businessAvailability';

export const BusinessSearchPage: React.FC = () => {
  const { t } = useTranslation('businessSearch');
  const { data, loading, fetchBusinessOverview, refreshOverview } = useBusinessAvailabilityOverview();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Load initial data
    fetchBusinessOverview();
  }, []);

  const handleSearch = () => {
    const filters: BusinessOverviewFilters = {};
    
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

  const navigate = useNavigate();

  const handleViewSlots = (calendarSlug: string) => {
    navigate(`/book/${calendarSlug}`);
  };

  const businessTypes = [
    { value: 'salon', label: t('businessSearch.types.salon', 'Hair Salon') },
    { value: 'clinic', label: t('businessSearch.types.clinic', 'Clinic') },
    { value: 'consultant', label: t('businessSearch.types.consultant', 'Consultant') },
    { value: 'trainer', label: t('businessSearch.types.trainer', 'Trainer') },
    { value: 'other', label: t('businessSearch.types.other', 'Other') }
  ];

  return (
    <main className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('businessSearch.page.title', 'Search Businesses')}</h1>
          <p className="text-muted-foreground">
            {t('businessSearch.page.subtitle', 'Search for businesses and view their availability')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            refreshOverview();
            fetchBusinessOverview();
          }}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('businessSearch.page.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Search section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            {t('businessSearch.page.searchCardTitle', 'Search')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <div className="flex-1">
              <Input
                placeholder={t('businessSearch.page.searchPlaceholder', 'Search by business name...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              {t('businessSearch.page.searchBtn', 'Search')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('businessSearch.page.filters', 'Filters')}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('businessSearch.page.businessTypeLabel', 'Business Type')}</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('businessSearch.page.selectType', 'Select type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('businessSearch.page.allTypes', 'All types')}</SelectItem>
                    {businessTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t('businessSearch.page.cityLabel', 'City')}</label>
                <Input
                  placeholder={t('businessSearch.page.cityPlaceholder', 'Search by city...')}
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={handleReset} className="w-full">
                  {t('businessSearch.page.resetFilters', 'Reset filters')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">
            {t('businessSearch.page.resultsLabel', 'Results')} ({data.length} {data.length !== 1 ? t('businessSearch.page.businessPlural', 'businesses') : t('businessSearch.page.businessSingular', 'business')})
          </h2>
          {loading && (
            <div className="text-sm text-muted-foreground">
              {t('businessSearch.page.loading', 'Loading...')}
            </div>
          )}
        </div>

        {data.length === 0 && !loading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                {t('businessSearch.page.empty', 'No businesses found. Try different search terms.')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.map((business) => (
              <BusinessOverviewCard
                key={business.user_id}
                business={business}
                onViewSlots={handleViewSlots}
                showFullDetails={false}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};
