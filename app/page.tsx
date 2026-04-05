import Link from "next/link";
import { QuoteForm } from "@/components/form/quote-form";

export default function Home() {
  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            CarrierMatch
          </h1>
          <p className="text-slate-400">
            Find the right life insurance carrier in seconds
          </p>
          <Link
            href="/history"
            className="inline-block text-sm text-primary hover:text-primary-light transition-colors"
          >
            View search history
          </Link>
        </div>

        {/* Form */}
        <QuoteForm />
      </div>
    </main>
  );
}
