
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useSettingsData } from '@/hooks/useSettingsData';
import { ImprovedAvailabilityManager } from './ImprovedAvailabilityManager';

export const AvailabilityManager = () => {
  // Simply delegate to the improved version
  return <ImprovedAvailabilityManager />;
};
