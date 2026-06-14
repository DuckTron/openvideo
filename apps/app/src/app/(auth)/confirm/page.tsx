import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Check your email",
  description: "Confirm your email to continue",
};

export default function ConfirmPage() {
  return (
    <AuthLayout variant="single">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="p-4 rounded-full bg-secondary/50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            className="size-6 text-muted-foreground"
            fill="currentColor"
          >
            <path d="M224,48H32a8,8,0,0,0-8,8V192a8,8,0,0,0,8,8H224a8,8,0,0,0,8-8V56A8,8,0,0,0,224,48Zm-18,16L128,127.3,48,64ZM40,184V79.9l75.4,59.3a8.1,8.1,0,0,0,10.6,0L216,79.9V184Z" />
          </svg>
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
    </AuthLayout>
  );
}
