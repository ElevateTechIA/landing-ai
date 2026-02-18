"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import { useRouter } from "next/navigation";
import { logout } from "@/actions/social-media/auth.actions";
import {
  LayoutDashboard,
  PenSquare,
  FileText,
  Calendar,
  Link2,
  MessageCircle,
  Settings,
  LogOut,
  Home,
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
  const router = useRouter();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">SocialPost</h1>
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
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className="w-5 h-5" />
              {t(`socialMedia.sidebar.${labelKey}`)}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full"
        >
          <Home className="w-5 h-5" />
          {t("socialMedia.sidebar.home")}
        </Link>
        <button
          onClick={async () => {
            await logout();
            router.push("/auth/login");
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          {t("socialMedia.auth.logout")}
        </button>
      </div>
    </aside>
  );
}
