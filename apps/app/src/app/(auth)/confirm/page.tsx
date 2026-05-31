import type { Metadata } from "next";
import Link from "next/link";
import { LogoIcons } from "@/components/shared/logos";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Check your email",
  description: "Confirm your email to continue",
};

export default function ConfirmPage() {
  return (
    <div className="min-h-screen flex flex-col bg-card">
      {/* Header - matching spaces page style */}
      <header className="h-12 flex items-center px-4 border-b sticky top-0 z-10 bg-card/80 backdrop-blur-md">
        <div className="w-full flex items-center">
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold tracking-tight">
            <LogoIcons.scenify className="size-5" />
            <span>OpenVideo</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[380px] pb-40">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="p-4 rounded-full bg-secondary/50">
              <Mail className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a magic link to your email address. Click the link to sign in.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Didn&apos;t receive it?{" "}
              <Link href="/signin" className="text-foreground hover:underline underline-offset-4">
                Try again
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
