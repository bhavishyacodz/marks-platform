"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type QuestionRow = {
  id: string;
  subject: "Physics" | "Chemistry" | "Mathematics";
  chapter: string;
  topic: string;
  year: number | null;
  shift: string;
  status: "verified" | "unverified";
  source: string;
  source_url: string | null;
  source_checked_at: string | null;
  source_notes: string | null;
  prompt: string;
  type: "mcq" | "numerical";
  options: { id: string; text: string }[];
  answer: string;
  tolerance: number | null;
  solution: string;
  difficulty: "Easy" | "Medium" | "Hard";
  publication_status: "draft" | "published";
};

const blank = {
  id: "", subject: "Physics" as QuestionRow["subject"], chapter: "", topic: "",
  year: "", shift: "", status: "unverified" as QuestionRow["status"], source: "Original practice question",
  source_url: "", source_checked_at: "", source_notes: "", prompt: "",
  type: "mcq" as QuestionRow["type"], optionsText: "a | First option\nb | Second option\nc | Third option\nd | Fourth option",
  answer: "a", tolerance: "0.001", solution: "", difficulty: "Medium" as QuestionRow["difficulty"],
  publication_status: "draft" as QuestionRow["publication_status"],
};

export default function AdminQuestionManager() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<QuestionRow[]>([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Sign in with your authorized admin email to continue.");

  async function refresh() {
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData.user ?? null;
    setUser(currentUser);
    if (!currentUser) {
      setIsAdmin(false);
      setItems([]);
      return;
    }
    const { data: registration, error: registrationError } = await supabase
      .from("admin_users").select("user_id").eq("user_id", currentUser.id).maybeSingle();
    if (registrationError) {
      setNotice("Could not check admin access. Confirm the Supabase tables and policies are installed.");
      setIsAdmin(false);
      return;
    }
    if (!registration) {
      setIsAdmin(false);
      setNotice("Signed in, but this account is not on the admin allowlist. Register your user ID in public.admin_users using the Supabase SQL Editor.");
      return;
    }
    setIsAdmin(true);
    const { data, error } = await supabase.from("questions")
      .select("*").order("updated_at", { ascending: false }).limit(200);
    if (error) setNotice("Could not load questions: " + error.message);
    else {
      setItems((data ?? []) as QuestionRow[]);
      setNotice("Admin access confirmed. Changes save directly to Supabase.");
    }
  }

  useEffect(() => {
    void refresh();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void refresh(); });
    return () => listener.subscription.unsubscribe();
    // The client is created once for this mounted page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + "/admin/questions" },
    });
    setNotice(error ? error.message : "Check your email for the sign-in link, then return to this page.");
    setBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setIsAdmin(false); setItems([]);
    setNotice("Signed out.");
  }

  function startEdit(item: QuestionRow) {
    setEditingId(item.id);
    setForm({
      id: item.id, subject: item.subject, chapter: item.chapter, topic: item.topic,
      year: item.year == null ? "" : String(item.year), shift: item.shift, status: item.status,
      source: item.source, source_url: item.source_url ?? "", source_checked_at: item.source_checked_at ?? "",
      source_notes: item.source_notes ?? "", prompt: item.prompt, type: item.type,
      optionsText: (item.options ?? []).map((option) => option.id + " | " + option.text).join("\n"),
      answer: item.answer, tolerance: String(item.tolerance ?? 0.001), solution: item.solution,
      difficulty: item.difficulty, publication_status: item.publication_status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setBusy(true); setNotice("");
    const options = form.type === "numerical" ? [] : form.optionsText.split("\n")
      .map((line) => line.trim()).filter(Boolean).map((line) => {
        const separator = line.indexOf("|");
        if (separator < 1) return { id: line.toLowerCase().replace(/[^a-z0-9]+/g, "-"), text: line };
        return { id: line.slice(0, separator).trim(), text: line.slice(separator + 1).trim() };
      });
    const id = form.id.trim() || (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID() : "q-" + Date.now().toString(36));
    const payload = {
      id, subject: form.subject, chapter: form.chapter.trim(), topic: form.topic.trim(),
      year: form.year.trim() ? Number(form.year) : null, shift: form.shift.trim(),
      status: form.status, source: form.source.trim(), source_url: form.source_url.trim() || null,
      source_checked_at: form.source_checked_at || null, source_notes: form.source_notes.trim() || null,
      prompt: form.prompt.trim(), type: form.type, options, answer: form.answer.trim(),
      tolerance: form.type === "numerical" ? Number(form.tolerance || 0) : null,
      solution: form.solution.trim(), difficulty: form.difficulty,
      publication_status: form.publication_status, updated_at: new Date().toISOString(),
    };
    if (!payload.chapter || !payload.topic || !payload.prompt || !payload.answer || (form.type === "mcq" && options.length < 2)) {
      setNotice("Add chapter, topic, question, answer, and at least two MCQ options.");
      setBusy(false); return;
    }
    const result = editingId
      ? await supabase.from("questions").update(payload).eq("id", editingId)
      : await supabase.from("questions").insert(payload);
    if (result.error) setNotice("Save failed: " + result.error.message);
    else {
      setNotice(form.publication_status === "published" ? "Question published." : "Draft saved.");
      setForm(blank); setEditingId(null); await refresh();
    }
    setBusy(false);
  }

  async function changePublication(item: QuestionRow, status: QuestionRow["publication_status"]) {
    const { error } = await supabase.from("questions").update({ publication_status: status, updated_at: new Date().toISOString() }).eq("id", item.id);
    setNotice(error ? "Update failed: " + error.message : status === "published" ? "Question published." : "Question moved to drafts.");
    if (!error) await refresh();
  }

  const inputStyle = { width: "100%", padding: "12px", border: "1px solid #dfe4ee", borderRadius: 12, background: "#fff", color: "#172033" } as const;
  const labelStyle = { display: "grid", gap: 6, fontSize: 13, fontWeight: 650, color: "#47516a" } as const;

  return (
    <main style={{ minHeight: "100vh", background: "#f6f7fb", color: "#172033", padding: "20px 14px 56px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div><div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 800, color: "#4965ed" }}>MARKS / ADMIN</div><h1 style={{ fontSize: 28, margin: "6px 0" }}>Question manager</h1><p style={{ margin: 0, color: "#7b8497", fontSize: 14 }}>Create, review and publish JEE practice questions.</p></div>
          {user && <button onClick={() => void signOut()} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #dfe4ee", background: "#fff" }}>Sign out</button>}
        </header>
        <div role="status" style={{ padding: 13, borderRadius: 12, background: "#edf1ff", color: "#3046b7", marginBottom: 16, fontSize: 14 }}>{notice}</div>
        {!user ? (
          <section style={{ background: "#fff", border: "1px solid #e9ecf3", borderRadius: 18, padding: 18 }}>
            <h2 style={{ marginTop: 0 }}>Admin sign-in</h2>
            <p style={{ color: "#7b8497", fontSize: 14 }}>We'll email you a secure sign-in link. Only allowlisted accounts can manage questions.</p>
            <form onSubmit={signIn} style={{ display: "grid", gap: 12 }}>
              <label style={labelStyle}>Admin email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="you@example.com" /></label>
              <button disabled={busy} style={{ padding: 13, border: 0, borderRadius: 12, background: "#4965ed", color: "#fff", fontWeight: 750 }}>{busy ? "Sending link…" : "Email me a sign-in link"}</button>
            </form>
          </section>
        ) : !isAdmin ? (
          <section style={{ background: "#fff", border: "1px solid #e9ecf3", borderRadius: 18, padding: 18 }}>
            <h2 style={{ marginTop: 0 }}>Admin access not enabled</h2>
            <p style={{ color: "#7b8497", lineHeight: 1.6 }}>Your account is signed in, but it cannot manage questions until its Supabase user ID is added to the admin allowlist. This page cannot grant itself admin access.</p>
            <button onClick={() => void refresh()} style={{ padding: 12, borderRadius: 12, border: "1px solid #dfe4ee", background: "#fff" }}>Check access again</button>
          </section>
        ) : (
          <>
            <section style={{ background: "#fff", border: "1px solid #e9ecf3", borderRadius: 18, padding: 18, marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><h2 style={{ margin: "0 0 14px" }}>{editingId ? "Edit question" : "Add a question"}</h2><span style={{ fontSize: 12, color: "#7b8497" }}>{form.publication_status.toUpperCase()}</span></div>
              <form onSubmit={saveQuestion} style={{ display: "grid", gap: 13 }}>
                <label style={labelStyle}>Question ID (optional)<input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={!!editingId} style={inputStyle} placeholder="Auto-generated if blank" /></label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 12 }}>
                  <label style={labelStyle}>Subject<select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value as QuestionRow["subject"] })} style={inputStyle}><option>Physics</option><option>Chemistry</option><option>Mathematics</option></select></label>
                  <label style={labelStyle}>Difficulty<select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as QuestionRow["difficulty"] })} style={inputStyle}><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
                  <label style={labelStyle}>Question type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as QuestionRow["type"] })} style={inputStyle}><option value="mcq">Multiple choice</option><option value="numerical">Numerical</option></select></label>
                </div>
                <label style={labelStyle}>Chapter<input required value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Topic<input required value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Question prompt<textarea required rows={4} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} style={inputStyle} /></label>
                {form.type === "mcq" && <label style={labelStyle}>Options (one per line, format: a | option text)<textarea rows={5} value={form.optionsText} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} style={inputStyle} /></label>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 12 }}>
                  <label style={labelStyle}>Correct answer<input required value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} style={inputStyle} placeholder={form.type === "mcq" ? "Option ID, e.g. a" : "Numeric value"} /></label>
                  {form.type === "numerical" && <label style={labelStyle}>Tolerance<input type="number" min="0" step="any" value={form.tolerance} onChange={(e) => setForm({ ...form, tolerance: e.target.value })} style={inputStyle} /></label>}
                </div>
                <label style={labelStyle}>Solution / explanation<textarea rows={4} value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} style={inputStyle} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 12 }}>
                  <label style={labelStyle}>Year (optional)<input type="number" min="2000" max="2100" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} style={inputStyle} /></label>
                  <label style={labelStyle}>Shift<input value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} style={inputStyle} /></label>
                  <label style={labelStyle}>Difficulty review<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as QuestionRow["status"] })} style={inputStyle}><option value="unverified">Unverified</option><option value="verified">Verified</option></select></label>
                </div>
                <label style={labelStyle}>Source label<input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Official source URL (optional)<input type="url" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Source check date (optional)<input type="date" value={form.source_checked_at} onChange={(e) => setForm({ ...form, source_checked_at: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Verification notes (optional)<textarea rows={2} value={form.source_notes} onChange={(e) => setForm({ ...form, source_notes: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Publication<select value={form.publication_status} onChange={(e) => setForm({ ...form, publication_status: e.target.value as QuestionRow["publication_status"] })} style={inputStyle}><option value="draft">Save as draft</option><option value="published">Publish question</option></select></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button disabled={busy} type="submit" style={{ padding: 14, border: 0, borderRadius: 12, background: "#4965ed", color: "#fff", fontWeight: 750 }}>{busy ? "Saving…" : editingId ? "Save changes" : "Save question"}</button>
                  <button type="button" onClick={() => { setForm(blank); setEditingId(null); }} style={{ padding: 14, border: "1px solid #dfe4ee", borderRadius: 12, background: "#fff" }}>Clear form</button>
                </div>
              </form>
            </section>
            <section style={{ background: "#fff", border: "1px solid #e9ecf3", borderRadius: 18, padding: 18 }}>
              <h2 style={{ marginTop: 0 }}>Saved questions <span style={{ color: "#7b8497", fontSize: 14 }}>({items.length})</span></h2>
              {items.length === 0 ? <p style={{ color: "#7b8497" }}>No database questions yet. Your existing static question bank is separate and has not been changed.</p> : <div style={{ display: "grid", gap: 10 }}>{items.map((item) => <article key={item.id} style={{ border: "1px solid #e9ecf3", borderRadius: 14, padding: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}><div><div style={{ color: "#4965ed", fontSize: 11, fontWeight: 800 }}>{item.subject.toUpperCase()} · {item.publication_status.toUpperCase()}</div><strong style={{ display: "block", margin: "6px 0" }}>{item.prompt}</strong><span style={{ color: "#7b8497", fontSize: 12 }}>{item.chapter} / {item.topic}</span></div><button onClick={() => startEdit(item)} style={{ padding: "9px 11px", borderRadius: 10, border: "1px solid #dfe4ee", background: "#fff" }}>Edit</button></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}><button onClick={() => void changePublication(item, item.publication_status === "published" ? "draft" : "published")} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #dfe4ee", background: "#fff" }}>{item.publication_status === "published" ? "Move to draft" : "Publish"}</button></div>
              </article>)}</div>}
            </section>
          </>
        )}
        <p style={{ color: "#8b93a5", fontSize: 12, textAlign: "center", marginTop: 24 }}>Protected by Supabase Auth and database Row Level Security. Admin registration is managed separately.</p>
      </div>
    </main>
  );
}
