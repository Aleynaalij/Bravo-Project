import Link from "next/link";
import { signUpWithPassword } from "../login/actions";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex justify-center">
        <Logo href="/signup" />
      </div>

      <Card className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Create your account</h1>

        {error && <Alert variant="error">{error}</Alert>}

        <form action={signUpWithPassword} className="flex flex-col gap-3">
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
            minLength={8}
            className="rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <Button type="submit">Sign up</Button>
        </form>

        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </main>
  );
}
