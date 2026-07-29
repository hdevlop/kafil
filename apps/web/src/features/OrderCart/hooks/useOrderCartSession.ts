"use client";

import { useEffect } from "react";

import { useUser } from "najm-auth/client/react";

import { useOrderCartStore } from "../store/orderCartStore";

export function useOrderCartSession() {
  const user = useUser();
  const bindSession = useOrderCartStore((state) => state.bindSession);

  useEffect(() => {
    const userId = user?.id ?? null;
    bindSession(userId);
  }, [bindSession, user?.id]);
}
