"use client";

import { useEffect, ReactNode, useState } from "react";
import { useStore } from "@/store/useStore";
import { usePathname, useRouter } from "next/navigation";
import { Sun } from "lucide-react";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { user, setUser, loadingUser, setLoadingUser } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;
    async function checkAuth() {
      // If user is already set, we just make sure loading is false
      if (user) {
        if (active) setLoadingUser(false);
        return;
      }

      // If we are on public routes, don't fetch or block
      const isPublicRoute = pathname === "/login" || pathname === "/forgot-password" || pathname === "/register-complaint" || pathname === "/feedback";
      if (isPublicRoute) {
        if (active) setLoadingUser(false);
        return;
      }

      try {
        if (active) setLoadingUser(true);
        const res = await fetch("/api/auth/me");
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
          router.push("/login");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        if (!active) return;
        setUser(null);
        router.push("/login");
      } finally {
        if (active) setLoadingUser(false);
      }
    }

    checkAuth();
    return () => {
      active = false;
    };
  }, [pathname, user, setUser, setLoadingUser, router]);

  const isPublicRoute = pathname === "/login" || pathname === "/forgot-password" || pathname === "/register-complaint" || pathname === "/feedback";

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (!mounted || loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <Sun className="h-10 w-10 animate-spin text-amber-500" />
          <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider animate-pulse font-sans">
            Verifying Portal Credentials...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
