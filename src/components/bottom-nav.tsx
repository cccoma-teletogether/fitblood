"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, History, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/scan", icon: Camera, label: "스캔" },
  { href: "/history", icon: History, label: "이력" },
  { href: "/trends", icon: TrendingUp, label: "추이" },
  { href: "/settings", icon: Settings, label: "설정" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div className="mx-auto max-w-md flex">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
