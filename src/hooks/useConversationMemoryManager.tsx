
import { useCallback } from 'react';
import { useConversationMemory, useCreateConversationContext } from './useConversationContext';
import { useCreateBookingIntent, useUpdateBookingIntent } from './useBookingIntents';
import { ConversationContext, BookingIntent, ContextType } from '@/types/whatsapp';

export function useConversationMemoryManager(phoneNumber: string, calendarId: string) {
  const { data: memory, isLoading } = useConversationMemory(phoneNumber, calendarId);
  const createContext = useCreateConversationContext();
  const createBookingIntent = useCreateBookingIntent();
  const updateBookingIntent = useUpdateBookingIntent();

  const addContext = useCallback(async (
    conversationId: string,
    contextType: ContextType,
    contextData: Record<string, any>,
    expiresAt?: string
  ) => {
    return createContext.mutateAsync({
      conversation_id: conversationId,
      context_type: contextType,
      context_data: contextData,
      expires_at: expiresAt,
    });
  }, [createContext]);

  const startBookingIntent = useCallback(async (
    conversationId: string,
    initialData: Partial<BookingIntent> = {}
  ) => {
    return createBookingIntent.mutateAsync({
      conversation_id: conversationId,
      status: 'collecting_info',
      collected_data: {},
      ...initialData,
    });
  }, [createBookingIntent]);

  const updateBookingIntentData = useCallback(async (
    intentId: string,
    updates: Partial<BookingIntent>
  ) => {
    return updateBookingIntent.mutateAsync({
      id: intentId,
      ...updates,
    });
  }, [updateBookingIntent]);

  const addToBookingIntentData = useCallback(async (
    intentId: string,
    newData: Record<string, any>
  ) => {
    const activeIntent = memory?.active_booking_intent;
    if (!activeIntent) return;

    const updatedData = {
      ...activeIntent.collected_data,
      ...newData,
    };

    return updateBookingIntent.mutateAsync({
      id: intentId,
      collected_data: updatedData,
    });
  }, [memory?.active_booking_intent, updateBookingIntent]);

  const hasRecentContext = useCallback((contextType: ContextType, withinHours: number = 24) => {
    if (!memory?.context_history) return false;

    const cutoffTime = new Date(Date.now() - withinHours * 60 * 60 * 1000);
    return memory.context_history.some(
      context => 
        context.context_type === contextType && 
        new Date(context.created_at) > cutoffTime
    );
  }, [memory?.context_history]);

  const getContextByType = useCallback((contextType: ContextType) => {
    return memory?.context_history?.filter(
      context => context.context_type === contextType
    ) || [];
  }, [memory?.context_history]);

  const hasActiveBookingIntent = Boolean(memory?.active_booking_intent);

  return {
    memory,
    isLoading,
    addContext,
    startBookingIntent,
    updateBookingIntentData,
    addToBookingIntentData,
    hasRecentContext,
    getContextByType,
    hasActiveBookingIntent,
    activeIntent: memory?.active_booking_intent,
    previousBookings: memory?.previous_bookings || [],
    recentMessages: memory?.recent_messages || [],
  };
}
