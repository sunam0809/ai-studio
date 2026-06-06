import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export function useAuth() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useGetMe({
    query: {
      retry: false,
      staleTime: Infinity
    }
  });

  useEffect(() => {
    if (!isLoading && error && location !== '/login') {
      setLocation('/login');
    }
  }, [isLoading, error, location, setLocation]);

  const login = (token: string) => {
    localStorage.setItem('ai_studio_token', token);
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    setLocation('/');
  };

  const logout = () => {
    localStorage.removeItem('ai_studio_token');
    queryClient.clear();
    setLocation('/login');
  };

  return {
    user,
    isLoading,
    login,
    logout
  };
}
