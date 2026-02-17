import { redirect } from "next/navigation";
import { getSessionUser } from "@/actions/social-media/auth.actions";
import { SocialMediaAuthProvider } from "@/app/components/social-media/AuthProvider";
import Sidebar from "@/app/components/social-media/Sidebar";
import Topbar from "@/app/components/social-media/Topbar";
import { LanguageProvider } from "@/app/context/LanguageContext";

export default async function SocialMediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <LanguageProvider>
      <SocialMediaAuthProvider>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Topbar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </SocialMediaAuthProvider>
    </LanguageProvider>
  );
}
