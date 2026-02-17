"use client";

import { useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useSocialMediaAuth } from "./AuthProvider";
import { logout } from "@/actions/social-media/auth.actions";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown } from "lucide-react";

export default function Topbar() {
  const { t } = useLanguage();
  const { user } = useSocialMediaAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/auth/login");
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6">
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
        >
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt=""
              className="w-8 h-8 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
          )}
          <span className="font-medium">
            {user?.displayName || user?.email || ""}
          </span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t("socialMedia.auth.logout")}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
