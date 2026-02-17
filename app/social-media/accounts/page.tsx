"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import AccountsList from "@/app/components/social-media/AccountsList";

export default function AccountsPage() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        {t("socialMedia.accounts.title")}
      </h1>
      <AccountsList />
    </div>
  );
}
