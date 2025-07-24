"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { checkAuthState, fetchUserRoleFromToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Kiểm tra auth state khi app khởi động
    checkAuthState();
  }, [checkAuthState]);

  useEffect(() => {
    // Fetch user role nếu đã authenticated nhưng chưa có role
    if (isAuthenticated) {
      fetchUserRoleFromToken();
    }
  }, [isAuthenticated, fetchUserRoleFromToken]);

  return <>{children}</>;
}
