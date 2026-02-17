import LoginForm from "@/app/components/social-media/LoginForm";
import { LanguageProvider } from "@/app/context/LanguageContext";

export default function LoginPage() {
  return (
    <LanguageProvider>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </LanguageProvider>
  );
}
