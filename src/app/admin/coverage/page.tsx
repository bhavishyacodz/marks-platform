"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type CoverageRow = {
  source_paper_id: string;
  exam_name: string;
  year: number;
  exam_session: string;
  exam_date: string;
  shift: string;
  subject: string;
  expected_question_count: number | null;
  import_status: string;
  imported_count: number;
  verified_count: number;
  published_count: number;
  missing_prompt_count: number;
  missing_solution_count: number;
  remaining_count: number | null;
  coverage_status: string;
};

export default function AdminCoveragePage() {
  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [message, setMessage] = useState("Checking administrator access…");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          if (active) setMessage("Sign in with your authorized admin account first.");
          return;
        }
        const { data: admin, error: adminError } = await supabase
          .from("admin_users").select("user_id").eq("user_id", auth.user.id).maybeSingle();
        if (adminError || !admin) {
          if (active) setMessage("This account is not authorized to view the coverage report.");
          return;
        }
        const { data, error } = await supabase
          .from("admin_question_coverage")
          .select("*")
          .order("year", { ascending: false })
          .order("exam_date", { ascending: false })
          .order("shift", { ascending: true })
          .order("subject", { ascending: true });
        if (error) throw error;
        if (active) {
          setRows((data ?? []) as CoverageRow[]);
          setMessage(data?.length ? "Coverage inventory loaded." : "No source papers have been registered yet. Add paper inventory rows after applying the coverage migration.");
        }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Could not load coverage report. Apply the coverage migration and check Supabase policies.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const totals = rows.reduce((a, r) => ({
    expected: a.expected + (r.expected_question_count ?? 0),
    imported: a.imported + r.imported_count,
    verified: a.verified + r.verified_count,
    published: a.published + r.published_count,
    remaining: a.remaining + (r.remaining_count ?? 0),
    unconfirmed: a.unconfirmed + (r.expected_question_count == null ? 1 : 0),
  }), { expected: 0, imported: 0, verified: 0, published: 0, remaining: 0, unconfirmed: 0 });

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">MARKS · Admin</p>
        <h1 className="text-3xl font-bold tracking-tight">Question coverage</h1>
        <p className="max-w-3xl text-sm text-neutral-600 dark:text-neutral-300">
          Track source papers, imported questions, verified answers and remaining gaps by year, date, shift and subject.
        </p>
        <p role="status" className="rounded-lg border p-3 text-sm">{loading ? "Loading report…" : message}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["Registered papers", rows.length],
          ["Expected questions", totals.expected],
          ["Imported", totals.imported],
          ["Verified", totals.verified],
          ["Published", totals.published],
          ["Remaining (known)", totals.remaining],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border p-4">
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      {totals.unconfirmed > 0 && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          {totals.unconfirmed} registered paper(s) have no checked expected count. Their completeness is unconfirmed, not zero-missing.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-neutral-100 text-xs dark:bg-neutral-900">
            <tr>
              {["Year / session", "Date", "Shift", "Subject", "Expected", "Imported", "Verified", "Published", "Remaining", "Status"].map((h) => (
                <th key={h} className="px-3 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.source_paper_id} className="border-t align-top">
                <td className="px-3 py-3">{r.year} · {r.exam_session}</td>
                <td className="px-3 py-3 whitespace-nowrap">{r.exam_date}</td>
                <td className="px-3 py-3">{r.shift}</td>
                <td className="px-3 py-3">{r.subject}</td>
                <td className="px-3 py-3 tabular-nums">{r.expected_question_count ?? "Not set"}</td>
                <td className="px-3 py-3 tabular-nums">{r.imported_count}</td>
                <td className="px-3 py-3 tabular-nums">{r.verified_count}</td>
                <td className="px-3 py-3 tabular-nums">{r.published_count}</td>
                <td className="px-3 py-3 tabular-nums">{r.remaining_count ?? "Unknown"}</td>
                <td className="px-3 py-3">{r.coverage_status.replaceAll("_", " ")}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-neutral-500">No paper inventory yet. This report fills in after inventory rows are created.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">
        Matching counts alone cannot prove completeness. The importer must also check the original question-number set and flag duplicate or unreadable questions.
      </p>
    </main>
  );
}
