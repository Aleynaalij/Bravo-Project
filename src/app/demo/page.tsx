import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { DemoWalkthrough } from "./demo-walkthrough";

export default async function DemoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <DemoWalkthrough />
      </main>
    </>
  );
}
