'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { MetricsDash, MetricsDashClient } from './index';
import { MetricsDashOptions } from './core/config';

interface MetricsDashContextType {
  client: MetricsDashClient | null;
  trackPageview: (path?: string) => void;
  trackEvent: (eventName: string, payload?: Record<string, any>) => void;
  flush: () => void;
}

const MetricsDashContext = createContext<MetricsDashContextType>({
  client: null,
  trackPageview: () => {},
  trackEvent: () => {},
  flush: () => {},
});

export interface MetricsDashProviderProps {
  publicSdkKey: string;
  host?: string;
  options?: Omit<MetricsDashOptions, 'publicSdkKey' | 'host'>;
  children: React.ReactNode;
}

export function MetricsDashProvider({
  publicSdkKey,
  host,
  options,
  children,
}: MetricsDashProviderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && typeof window !== 'undefined') {
      MetricsDash.init({
        publicSdkKey,
        host,
        ...options,
      });
      initialized.current = true;
    }
  }, [publicSdkKey, host, options]);

  const client = MetricsDashClient.getInstance();

  const value: MetricsDashContextType = {
    client,
    trackPageview: (path?: string) => MetricsDash.trackPageview(path),
    trackEvent: (eventName: string, payload?: Record<string, any>) => MetricsDash.trackEvent(eventName, payload),
    flush: () => MetricsDash.flush(),
  };

  return (
    <MetricsDashContext.Provider value={value}>
      {children}
    </MetricsDashContext.Provider>
  );
}

export function useMetricsDash(): MetricsDashContextType {
  return useContext(MetricsDashContext);
}
