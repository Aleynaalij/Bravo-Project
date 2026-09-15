import Link from "next/link";
import { signInWithPassword, signInWithMicrosoft } from "./actions";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex justify-center">
        <Logo href="/login" />
      </div>

      <Card className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Log in</h1>

        {message && <Alert variant="info">{message}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}

        <form action={signInWithPassword} className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <Link href="/forgot-password" className="self-end text-xs text-brand hover:underline">
            Forgot password?
          </Link>
          <Button type="submit">Log in</Button>
        </form>

        <form action={signInWithMicrosoft}>
          <Button type="submit" variant="secondary" className="w-full">
            Continue with Microsoft
          </Button>
        </form>

        <p className="text-sm text-muted">
          No account?{" "}
          <Link href="/signup" className="text-brand hover:underline">
            Sign up
          </Link>
        </p>
      </Card>

      <p className="text-center text-xs text-muted">
        By continuing you agree to our{" "}
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
