"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function GeneratingPoller() {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 3500);
    return () => window.clearInterval(id);
  }, [router]);
  return null;
}
