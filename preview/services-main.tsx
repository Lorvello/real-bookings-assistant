// DEV-ONLY no-auth visual harness for the Services settings surface (launch-ready-loop §7).
// The Services tab is hook-heavy (CalendarContext / useServiceTypes / useTeamMemberServices),
// but the heavy NEW UI is PURE props: ServiceTypeCard, ServiceTypeForm, ServiceCalendarSelector,
// InlineCalendarCreation, the empty states. We mount the REAL components against local mock
// state (AuthProvider + QueryClient only so the in-form hooks don't crash). Not in prod build.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Tag } from 'lucide-react';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { ServiceTypeCard } from '@/components/settings/service-types/ServiceTypeCard';
import { ServiceTypeForm } from '@/components/settings/service-types/ServiceTypeForm';
import { ServiceTypesEmptyState } from '@/components/settings/service-types/ServiceTypesEmptyState';
import { ServiceTypesLoadingState } from '@/components/settings/service-types/ServiceTypesLoadingState';
import { InlineCalendarCreation } from '@/components/settings/service-types/InlineCalendarCreation';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const MOCK_SERVICES: any[] = [
  { id: '1', name: 'Signature Haircut', description: 'Wash, cut and finish with a senior stylist.', duration: 45, price: 45, color: '#10B981', tax_enabled: false },
  { id: '2', name: 'Balayage & Tone', description: 'Full balayage with gloss tone and blow-dry.', duration: 150, price: 165, color: '#8B5CF6', tax_enabled: true, tax_behavior: 'inclusive', tax_code: 'txcd_99999999', stripe_test_price_id: 'price_123' },
  { id: '3', name: 'Quick Fringe Trim', description: 'A free between-visits fringe tidy-up.', duration: 15, price: 0, color: '#F59E0B', tax_enabled: false },
];

const MOCK_CALENDARS: any[] = [
  { id: 'c1', name: 'Glow Studio — Main', description: 'Front-of-house chairs', color: '#10B981' },
  { id: 'c2', name: 'Glow Studio — Colour Room', description: null, color: '#8B5CF6' },
];

function Harness() {
  const [formData, setFormData] = useState<any>({
    name: 'Signature Haircut',
    description: 'Wash, cut and finish with a senior stylist.',
    duration: '45',
    price: '45',
    color: '#10B981',
    tax_enabled: false,
    tax_behavior: 'exclusive',
    tax_code: '',
    preparation_time: '5',
    cleanup_time: '10',
  });
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>('c1');

  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delayDuration={150}>
            <div className="dark main-scrollbar h-screen overflow-y-auto bg-background p-3 md:p-8">
              <div className="mx-auto max-w-6xl">
                <SimplePageHeader title="Settings" />
                <div className="mt-6 flex flex-col gap-5 md:mt-8 md:flex-row md:gap-8">
                  <aside className="md:w-60 md:shrink-0" />
                  <div className="min-w-0 flex-1 space-y-8 md:max-w-3xl">
                    {/* 1. Manager — populated grid */}
                    <SettingsSection
                      icon={Tag}
                      title="Services"
                      description="The services customers can book — duration, price and who performs them."
                      usedByAgent
                      action={
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Add service
                        </Button>
                      }
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {MOCK_SERVICES.map((s) => (
                          <ServiceTypeCard key={s.id} service={s} onEdit={() => {}} onDelete={() => {}} />
                        ))}
                      </div>
                    </SettingsSection>

                    {/* 1b. Loading skeleton (cold-load placeholder) */}
                    <SettingsSection icon={Tag} title="Services (loading skeleton)">
                      <ServiceTypesLoadingState />
                    </SettingsSection>

                    {/* 2. Empty state */}
                    <SettingsSection icon={Tag} title="Services (empty state)" flush>
                      <ServiceTypesEmptyState onAddService={() => {}} />
                    </SettingsSection>

                    {/* 3. The create/edit form, as it appears inside the dialog */}
                    <div className="rounded-xl border border-white/[0.08] bg-card p-5 md:p-6">
                      <div className="mb-5">
                        <h3 className="text-base font-semibold text-foreground">Edit service type</h3>
                        <p className="text-sm text-muted-foreground">Update service details and team member assignments</p>
                      </div>
                      <ServiceTypeForm
                        formData={formData}
                        setFormData={setFormData}
                        onSave={() => {}}
                        onCancel={() => {}}
                        saving={false}
                        isEditing
                        calendarId="c1"
                        selectedTeamMembers={[]}
                        onTeamMembersChange={() => {}}
                        calendars={MOCK_CALENDARS}
                        selectedCalendarId={selectedCalendarId}
                        onCalendarSelect={setSelectedCalendarId}
                        onCalendarCreated={() => {}}
                      />
                    </div>

                    {/* 4. Inline calendar creation (reached via the selector's "create new") */}
                    <div className="rounded-xl border border-white/[0.08] bg-card p-5 md:p-6">
                      <div className="mb-3">
                        <h3 className="text-base font-semibold text-foreground">Inline calendar creation</h3>
                      </div>
                      <InlineCalendarCreation onCalendarCreated={() => {}} onCancel={() => {}} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
