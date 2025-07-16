'use client';

import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

interface AmplifyProviderProps {
  children: React.ReactNode;
}

export function AmplifyProvider({ children }: AmplifyProviderProps) {
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    try {
      Amplify.configure(outputs, {
        ssr: true
      });
      setIsConfigured(true);
    } catch (error) {
      console.error('Error configuring Amplify:', error);
    }
  }, []);

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
