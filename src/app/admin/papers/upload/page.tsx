"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Subject = "Physics" | "Chemistry" | "Mathematics";

export default function AdminPaperUploadPage() {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [year, setYear] = useState("2026");
  const [session, setSession] = useState("Session 1");
  const [date, setDate] = useState("");
  const [shift, setShift] = useState("Shift 1");
  const [subject, setSubject] = useState<Subject>("Physics");
  const [expected, setExpected] = useState("");
  const [paper, setPaper] = useState<File | null>(null);
  const [key, setKey] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Checking administrator access…");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Sign in with your authorized admin account first.");
        const { data: admin, error } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
        if (error || !admin) throw new Error("This account is not on the admin allowlist.");
        if (active) { setAllowed(true); setMessage("Admin access confirmed."); }
      } catch (e) {
        if (active) setMessage(e instanceof Error ? e.message : "Could not check admin access.");
      } finally { if (active) setChecking(false); }
    })();
    return () => { active = false; };
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paper || !key) { setMessage("Choose both the original question paper PDF and answer-key PDF."); return; }
    if (paper.type !== "application/pdf" || key.type !== "application/pdf") { setMessage("Only PDF files are accepted."); return; }
    if (paper.size > 50 * 1024 * 1024 || key.size > 50 * 1024 * 1024) { setMessage("Each PDF must be 50 MB or smaller."); return; }
    const numericYear = Number(year);
    const expectedCount = expected.trim() ? Number(expected) : null;
    if (!Number.isInteger(numericYear) || numericYear < 2019 || numericYear > 2100) { setMessage("Enter a valid exam year."); return; }
    if (expectedCount !== null && (!Number.isInteger(expectedCount) || expectedCount < 1 || expectedCount > 500)) { setMessage("Expected question count must be between 1 and 500, or left blank until checked."); return; }
    setBusy(true); setMessage("Uploading private source PDFs…");
    try {
      const supabase = createSupabaseBrowserClient();
      const safeBase = `${numericYear}/${session.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${date}/${shift.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${subject.toLowerCase()}`;
      const paperPath = `${safeBase}/question-paper.pdf`;
      const keyPath = `${safeBase}/answer-key.pdf`;
      const paperUpload = await supabase.storage.from("exam-source-pdfs").upload(paperPath, paper, { contentType: "application/pdf", upsert: true });
      if (paperUpload.error) throw paperUpload.error;
      const keyUpload = await supabase.storage.from("exam-source-pdfs").upload(keyPath, key, { contentType: "application/pdf", upsert: true });
      if (keyUpload.error) throw keyUpload.error;
      const { error } = await supabase.from("exam_papers").upsert({
        exam_name: "JEE Main", year: numericYear, exam_session: session, exam_date: date, shift, subject,
        source_pdf_path: paperPath, answer_key_path: keyPath, expected_question_count: expectedCount,
        import_status: "uploaded", notes: notes.trim() || null, updated_at: new Date().toISOString(),
      }, { onConflict: "exam_name,year,exam_session,exam_date,shift,subject" });
      if (error) throw error;
      setMessage("Source PDFs uploaded and paper inventory saved. Extraction and answer matching have not run yet; this paper is not verified.");
      setPaper(null); setKey(null);
      const form = e.currentTarget;
      form.reset();
      setYear(String(numericYear)); setSession(session); setDate(date); setShift(shift); setSubject(subject); setExpected(expected);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed. Check the migration, private bucket, and admin policies.");
    } finally { setBusy(false); }
  }

  return <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">MARKS · Admin</p>
      <h1 className="text-3xl font-bold tracking-tight">Add source paper</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">Upload the official paper and answer key once for a specific date, shift and subject. Files remain in private Supabase storage.</p>
      <p role="status" className="rounded-lg border p-3 text-sm">{checking ? "Checking access…" : message}</p>
    </header>
    {allowed && <form onSubmit={submit} className="space-y-5 rounded-2xl border p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">Exam year<input required type="number" min="2019" max="2100" value={year} onChange={e=>setYear(e.target.value)} className="w-full rounded-lg border bg-transparent p-3"/></label>
        <label className="space-y-1 text-sm">Session<select value={session} onChange={e=>setSession(e.target.value)} className="w-full rounded-lg border bg-transparent p-3"><option>Session 1</option><option>Session 2</option></select></label>
        <label className="space-y-1 text-sm">Exam date<input required type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-lg border bg-transparent p-3"/></label>
        <label className="space-y-1 text-sm">Shift<select value={shift} onChange={e=>setShift(e.target.value)} className="w-full rounded-lg border bg-transparent p-3"><option>Shift 1</option><option>Shift 2</option></select></label>
        <label className="space-y-1 text-sm">Subject<select value={subject} onChange={e=>setSubject(e.target.value as Subject)} className="w-full rounded-lg border bg-transparent p-3"><option>Physics</option><option>Chemistry</option><option>Mathematics</option></select></label>
        <label className="space-y-1 text-sm">Expected question count (optional)<input type="number" min="1" max="500" value={expected} onChange={e=>setExpected(e.target.value)} placeholder="Leave blank until checked" className="w-full rounded-lg border bg-transparent p-3"/></label>
      </div>
      <label className="block space-y-2 text-sm">Official question paper PDF<input required type="file" accept="application/pdf,.pdf" onChange={e=>setPaper(e.target.files?.[0] ?? null)} className="block w-full rounded-lg border p-3"/></label>
      <label className="block space-y-2 text-sm">Official answer-key PDF<input required type="file" accept="application/pdf,.pdf" onChange={e=>setKey(e.target.files?.[0] ?? null)} className="block w-full rounded-lg border p-3"/></label>
      <label className="block space-y-1 text-sm">Source notes (optional)<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Official source URL, paper code, any notes" className="w-full rounded-lg border bg-transparent p-3"/></label>
      <p className="text-xs text-neutral-500">PDF limit: 50 MB each. Only administrators can read these files. Uploading does not extract or publish questions.</p>
      <button disabled={busy || checking || !allowed} className="rounded-xl bg-neutral-900 px-5 py-3 font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900">{busy ? "Uploading…" : "Upload source PDFs"}</button>
    </form>}
  </main>;
}
