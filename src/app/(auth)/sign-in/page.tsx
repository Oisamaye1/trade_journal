import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNextPath } from "@/lib/routes";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to PropBook with a magic link or Google.",
  robots: { index: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  link: "That sign-in link is invalid or has expired. Request a new one below.",
  oauth: "Google sign-in isn't available right now. Use an email link instead.",
  config: "Sign-in isn't configured on this server yet. Check the Supabase environment variables.",
};

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <Card>
      <CardHeader>
        <h1 className="text-xl font-semibold">Sign in to PropBook</h1>
        <CardDescription>
          We&apos;ll email you a secure sign-in link. New here? The same link creates your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<SignInFormSkeleton />}>
          <SignInFormWithParams searchParams={searchParams} />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function SignInFormWithParams({
  searchParams,
}: {
  searchParams: PageProps<"/sign-in">["searchParams"];
}) {
  const params = await searchParams;
  const errorKey = typeof params.error === "string" ? params.error : undefined;
  return (
    <SignInForm
      next={safeNextPath(params.next)}
      initialError={errorKey ? (ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.link) : undefined}
    />
  );
}

function SignInFormSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading sign-in form">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
