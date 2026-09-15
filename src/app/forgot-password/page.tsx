import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex justify-center">
        <Logo href="/login" />
      </div>

      <Card className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold">Reset your password</h1>
          <p className="text-sm text-muted">
            Enter the email on your account and we&apos;ll send you a reset link.
          </p>
        </div>
        {error && <Alert variant="error">That reset link is no longer valid — request a new one below.</Alert>}
        <ForgotPasswordForm />
      </Card>

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="text-brand hover:underline">
          &larr; Back to log in
        </Link>
      </p>
    </main>
  );
}
