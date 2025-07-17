"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { checkAuthState } = useAuthStore();

  useEffect(() => {
    // Kiểm tra auth state khi app khởi động
    checkAuthState();
  }, [checkAuthState]);

  return <>{children}</>;
}
