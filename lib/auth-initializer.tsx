"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { checkAuthState, fetchUserRoleFromToken, fetchAndSetUserProfile, isAuthenticated } = useAuthStore();

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserRoleFromToken();
      fetchAndSetUserProfile();
    }
  }, [isAuthenticated, fetchUserRoleFromToken, fetchAndSetUserProfile]);

  return <>{children}</>;
}
