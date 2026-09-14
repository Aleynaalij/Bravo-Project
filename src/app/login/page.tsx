import Link from "next/link";
import { signInWithPassword, signInWithMicrosoft } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Log in to PurviewPilot</h1>

      {message && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <form action={signInWithPassword} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="rounded-md border px-3 py-2"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          className="rounded-md border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-md bg-black px-3 py-2 text-white"
        >
          Log in
        </button>
      </form>

      <form action={signInWithMicrosoft}>
        <button
          type="submit"
          className="w-full rounded-md border px-3 py-2"
        >
          Continue with Microsoft
        </button>
      </form>

      <p className="text-sm text-gray-600">
        No account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
