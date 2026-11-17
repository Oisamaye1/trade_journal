import { Logo } from "@/components/app-shell/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <Logo />
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
