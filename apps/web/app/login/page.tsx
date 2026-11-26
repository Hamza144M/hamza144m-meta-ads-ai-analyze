import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="card mt-8 p-6 sm:p-8">
          <h1 className="text-center text-xl font-bold text-slate-900 dark:text-white">Welcome back</h1>
          <p className="mb-6 mt-1 text-center text-sm text-slate-500">Sign in to save reports and come back to them anytime.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
