import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "../login/LoginForm";

export const metadata: Metadata = {
  title: "Create your free account",
  description: "Sign up free and get 3 AI audits of your Meta Ads reports every day.",
  alternates: { canonical: "/signup" },
};

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="card mt-8 p-6 sm:p-8">
          <h1 className="text-center text-xl font-bold text-slate-900 dark:text-white">Create your free account</h1>
          <p className="mb-6 mt-1 text-center text-sm text-slate-500">3 free audits every day. No card needed.</p>
          <Suspense>
            <LoginForm mode="signup" />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
