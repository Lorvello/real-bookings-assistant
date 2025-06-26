
import { useBusinessOverviewFetch } from './useBusinessOverviewFetch';
import { useBusinessSlots } from './useBusinessSlots';
import { useBusinessOverviewRefresh } from './useBusinessOverviewRefresh';

export const useBusinessAvailabilityOverview = () => {
  const { data, loading: fetchLoading, fetchBusinessOverview } = useBusinessOverviewFetch();
  const { loading: slotsLoading, getBusinessSlots } = useBusinessSlots();
  const { loading: refreshLoading, refreshOverview } = useBusinessOverviewRefresh();

  // Combine loading states
  const loading = fetchLoading || slotsLoading || refreshLoading;

  return {
    data,
    loading,
    fetchBusinessOverview,
    getBusinessSlots,
    refreshOverview
  };
};

// Re-export types for backward compatibility
export type { BusinessAvailabilityOverview, BusinessSlot } from '@/types/businessAvailability';
