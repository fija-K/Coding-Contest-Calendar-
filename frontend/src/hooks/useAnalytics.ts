import { useState, useEffect, useCallback } from 'react';
import { AnalyticsData } from '../types/contest';
import { recordStudentVisit, fetchAnalyticsStats } from '../services/api';

const VISITOR_ID_KEY = 'ccc_visitor_id';

export function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id || id.trim().length < 4) {
      id = 'stu_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return 'stu_' + Math.random().toString(36).substring(2, 10);
  }
}

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const initVisit = useCallback(async () => {
    try {
      const visitorId = getOrCreateVisitorId();
      const data = await recordStudentVisit(visitorId);
      setAnalytics(data);
    } catch (err) {
      console.warn('Could not record student visit telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchAnalyticsStats();
      setAnalytics(data);
    } catch (err) {
      console.warn('Failed to refresh analytics stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initVisit();
  }, [initVisit]);

  return {
    analytics,
    isLoading,
    refreshAnalytics,
    isModalOpen,
    setIsModalOpen,
  };
}
