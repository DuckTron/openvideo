import type { Metadata } from "next";
import Link from "next/link";
import { LogoIcons } from "@/components/shared/logos";
import { Button } from "@/components/ui/button";
import { FakeAIAssistant } from "./fake-ai-assistant";
import { BrowserWithBackground } from "@/components/browser-with-background";
import { BrowserWithBackgroundLayer } from "@/components/browser-with-background-layer";

interface AuthLayoutProps {
  children: React.ReactNode;
  headerLink: { href: string; label: string };
}

export function AuthLayout({ children, headerLink }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Auth form */}
      <div className="flex-1 flex flex-col bg-card">
        {/* Header */}
        <header className="h-12 flex items-center px-6 border-b sticky top-0 z-10 bg-card/80 backdrop-blur-md">
          <div className="w-full flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2.5 font-bold tracking-tight">
              <LogoIcons.scenify className="size-5" />
              <span>OpenVideo</span>
            </Link>
            <Button variant="outline" size="sm" asChild>
              <Link href={headerLink.href}>{headerLink.label}</Link>
            </Button>
          </div>
        </header>

        {/* Main content - centered form */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[380px]">{children}</div>
        </main>
      </div>

      {/* Right side - AI Assistant Demo */}
      <div className="hidden lg:flex flex-1 bg-card relative overflow-hidden border-border/60  border-l ">
        <BrowserWithBackgroundLayer />
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="pointer-events-auto w-80">
            <FakeAIAssistant />
          </div>
        </div>
      </div>
    </div>
  );
}
