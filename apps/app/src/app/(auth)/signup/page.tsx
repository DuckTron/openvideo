import type { Metadata } from "next";
import Link from "next/link";
import { LogoIcons } from "@/components/shared/logos";
import { Button } from "@/components/ui/button";
import { UserAuthForm } from "@/components/user-auth-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your OpenVideo account",
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col bg-card">
      {/* Header - matching spaces page style */}
      <header className="h-12 flex items-center px-4 border-b sticky top-0 z-10 bg-card/80 backdrop-blur-md">
        <div className="w-full flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold tracking-tight">
            <LogoIcons.scenify className="size-5" />
            <span>OpenVideo</span>
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link href="/signin">Sign in</Link>
          </Button>
        </div>
      </header>

      {/* Main content - centered form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[380px]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
              <p className="text-sm text-muted-foreground">Enter your email to get started</p>
            </div>
            <UserAuthForm kind="signup" />
            <p className="text-center text-xs text-muted-foreground">
              By signing up, you agree to our{" "}
              <Link
                href="/terms"
                className="hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
