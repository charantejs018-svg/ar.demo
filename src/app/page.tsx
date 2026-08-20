import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight mb-3">
        Share your files. From anywhere in India.
      </h1>
      <p className="text-slate-600 max-w-md mb-8">
        Securely upload, store and share your documents and files from anywhere, on any device.
      </p>
      <div className="flex gap-3">
        <Link href="/register" className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700">
          Get started
        </Link>
        <Link href="/login" className="border border-slate-300 px-5 py-2.5 rounded-lg font-medium hover:bg-slate-100">
          Log in
        </Link>
      </div>
    </main>
  );
}
