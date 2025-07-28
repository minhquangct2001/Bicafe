"use client";
import { useEffect, useRef } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { useAuthStore } from "@/lib/auth-store";

const client = generateClient<Schema>();

interface UseOrderSubscriptionsProps {
  onOrderCreated?: (order: Schema["Order"]["type"]) => void;
  onOrderUpdated?: (order: Schema["Order"]["type"]) => void;
  onOrderDeleted?: (order: Schema["Order"]["type"]) => void;
}

export function useOrderSubscriptions({
  onOrderCreated,
  onOrderUpdated,
  onOrderDeleted,
}: UseOrderSubscriptionsProps = {}) {
  const { user } = useAuthStore();
  const subscriptionsRef = useRef<Array<{ unsubscribe: () => void }>>([]);

  useEffect(() => {
    if (!user) {
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
      subscriptionsRef.current = [];
      return;
    }

    // Subscribe to order creation using built-in onCreate subscription
    if (onOrderCreated) {
      const createSub = client.models.Order.onCreate().subscribe({
        next: (data) => {
          if (data) {
            onOrderCreated(data);
          }
        },
        error: (error) => {
          console.error("Order creation subscription error:", error);
        },
      });
      subscriptionsRef.current.push(createSub);
    }

    // Subscribe to order updates using built-in onUpdate subscription
    if (onOrderUpdated) {
      const updateSub = client.models.Order.onUpdate().subscribe({
        next: (data) => {
          if (data) {
            onOrderUpdated(data);
          }
        },
        error: (error) => {
          console.error("Order update subscription error:", error);
        },
      });
      subscriptionsRef.current.push(updateSub);
    }

    if (onOrderDeleted) {
      const deleteSub = client.models.Order.onDelete().subscribe({
        next: (data) => {
          if (data) {
            onOrderDeleted(data);
          }
        },
        error: (error) => {
          console.error("Order deletion subscription error:", error);
        },
      });
      subscriptionsRef.current.push(deleteSub);
    }

    return () => {
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
      subscriptionsRef.current = [];
    };
  }, [user, onOrderCreated, onOrderUpdated, onOrderDeleted]);

  return {
    isConnected: !!user,
  };
}
