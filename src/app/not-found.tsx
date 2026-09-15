import Link from "next/link";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex justify-center">
        <Logo href="/dashboard" />
      </div>

      <Card className="flex flex-col items-center gap-3 text-center">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted">404</span>
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted">
          The page you&apos;re looking for doesn&apos;t exist, or you may not have access to it.
        </p>
        <Link href="/dashboard" className="mt-2">
          <Button type="button">Back to your projects</Button>
        </Link>
      </Card>
    </main>
  );
}
