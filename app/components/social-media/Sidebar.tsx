"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  LayoutDashboard,
  PenSquare,
  FileText,
  Calendar,
  Link2,
  MessageCircle,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/social-media/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { href: "/social-media/compose", icon: PenSquare, labelKey: "compose" },
  { href: "/social-media/posts", icon: FileText, labelKey: "posts" },
  { href: "/social-media/schedule", icon: Calendar, labelKey: "schedule" },
  { href: "/social-media/accounts", icon: Link2, labelKey: "accounts" },
  { href: "/social-media/whatsapp", icon: MessageCircle, labelKey: "whatsapp" },
  { href: "/social-media/settings", icon: Settings, labelKey: "settings" },
] as const;

export default function Sidebar() {
  const { t } = useLanguage();
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 min-h-screen flex flex-col">
      <div className="px-6 py-5">
        <h1 className="text-xl font-bold text-white">SocialPost</h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, labelKey }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              {t(`socialMedia.sidebar.${labelKey}`)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
