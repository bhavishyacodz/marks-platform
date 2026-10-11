"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

type Draft = {
  draftId: string;
  sourceQuestionId: string;
  displayedQuestionNumber: number;
  sourceFile: string;
  pageNumber: number;
  questionTypeHint: string | null;
  extractedBlock: string;
  contentStatus: string;
  status: string;
  warnings: string[];
};

type DraftBundle = {
  sourceFile?: string;
  pageCount?: number;
  draftCount?: number;
  drafts: Draft[];
};

type PageImage = { name: string; url: string; pageNumber: number };

function pageNumberFromFilename(name: string): number | null {
  const match = name.match(/page[-_ ]?(\d+)\.png$/i);
  return match ? Number(match[1]) : null;
}

export default function ImportReviewPage() {
  const [bundle, setBundle] = useState<DraftBundle | null>(null);
  const [images, setImages] = useState<PageImage[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => () => images.forEach((image) => URL.revokeObjectURL(image.url)), [images]);

  const drafts = bundle?.drafts ?? [];
  const visibleDrafts = useMemo(() => drafts.filter((draft) => {
    if (filter === "text") return draft.contentStatus === "text-candidate-review";
    if (filter === "metadata") return draft.contentStatus !== "text-candidate-review";
    return true;
  }), [drafts, filter]);

  const selectedDraft = visibleDrafts.find((draft) => draft.draftId === selectedDraftId) ?? visibleDrafts[0] ?? null;
  const selectedImage = selectedDraft ? images.find((image) => image.pageNumber === selectedDraft.pageNumber) : undefined;

  async function loadDrafts(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as DraftBundle).drafts)) {
        throw new Error("This JSON does not contain a drafts array.");
      }
      const next = parsed as DraftBundle;
      setBundle(next);
      setSelectedDraftId(next.drafts[0]?.draftId ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read the draft JSON.");
      setBundle(null);
    }
  }

  function loadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type === "image/png" || file.name.toLowerCase().endsWith(".png"));
    setImages((old) => {
      old.forEach((image) => URL.revokeObjectURL(image.url));
      return files.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
        pageNumber: pageNumberFromFilename(file.name) ?? -1,
      }));
    });
    setError("");
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px 96px", color: "var(--foreground, #172033)" }}>
      <a href="/" style={{ display: "inline-block", marginBottom: 18 }}>← Back to MARKS</a>
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: "#64748b" }}>SOURCE REVIEW WORKSPACE</p>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 40px)", lineHeight: 1.1, margin: "0 0 10px" }}>PDF question review</h1>
        <p style={{ margin: 0, lineHeight: 1.6, color: "#64748b" }}>Load your local draft JSON and rendered page PNGs to compare extracted text with the original paper. Files stay in this browser session; nothing is uploaded or published.</p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 18 }}>
        <label style={{ display: "block", border: "1px solid #dbe2ea", borderRadius: 14, padding: 16, background: "#f8fafc", color: "#172033" }}>
          <strong style={{ display: "block", marginBottom: 8 }}>1. Draft JSON</strong>
          <span style={{ display: "block", fontSize: 13, marginBottom: 12 }}>Choose the *-ocr-drafts.json file.</span>
          <input type="file" accept=".json,application/json" onChange={loadDrafts} />
        </label>
        <label style={{ display: "block", border: "1px solid #dbe2ea", borderRadius: 14, padding: 16, background: "#f8fafc", color: "#172033" }}>
          <strong style={{ display: "block", marginBottom: 8 }}>2. Page images</strong>
          <span style={{ display: "block", fontSize: 13, marginBottom: 12 }}>Select multiple PNGs named page-02.png, page-03.png, etc.</span>
          <input type="file" accept="image/png,.png" multiple onChange={loadImages} />
        </label>
      </section>

      {error && <p role="alert" style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", borderRadius: 10, padding: 12 }}>{error}</p>}

      {bundle && (
        <>
          <section style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
            <span style={{ borderRadius: 999, background: "#e2e8f0", padding: "7px 11px", fontSize: 13 }}>{drafts.length} drafts</span>
            <span style={{ borderRadius: 999, background: "#e2e8f0", padding: "7px 11px", fontSize: 13 }}>{bundle.pageCount ?? "?"} pages in source</span>
            <span style={{ borderRadius: 999, background: "#fff7ed", color: "#9a3412", padding: "7px 11px", fontSize: 13 }}>Review only · not verified</span>
            <span style={{ borderRadius: 999, background: "#e2e8f0", padding: "7px 11px", fontSize: 13 }}>{images.length} page images loaded</span>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.5fr)", gap: 16, alignItems: "start" }}>
            <aside style={{ border: "1px solid #dbe2ea", borderRadius: 14, padding: 12, minWidth: 0 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }} htmlFor="draft-filter">Show drafts</label>
              <select id="draft-filter" value={filter} onChange={(event) => { setFilter(event.target.value); setSelectedDraftId(""); }} style={{ width: "100%", padding: 10, marginBottom: 10 }}>
                <option value="all">All drafts</option>
                <option value="text">Text candidates</option>
                <option value="metadata">Metadata-only</option>
              </select>
              <div style={{ display: "grid", gap: 6, maxHeight: 520, overflowY: "auto" }}>
                {visibleDrafts.map((draft) => (
                  <button key={draft.draftId} type="button" onClick={() => setSelectedDraftId(draft.draftId)} style={{ textAlign: "left", padding: 10, borderRadius: 9, border: selectedDraft?.draftId === draft.draftId ? "2px solid #2563eb" : "1px solid #dbe2ea", background: selectedDraft?.draftId === draft.draftId ? "#eff6ff" : "white", color: "#172033" }}>
                    <strong style={{ display: "block" }}>Q{draft.displayedQuestionNumber} · Page {draft.pageNumber}</strong>
                    <span style={{ display: "block", fontSize: 12, color: "#64748b", overflowWrap: "anywhere" }}>{draft.sourceQuestionId}</span>
                    <span style={{ display: "block", fontSize: 11, marginTop: 4, color: "#9a3412" }}>Needs human review</span>
                  </button>
                ))}
                {visibleDrafts.length === 0 && <p>No drafts match this filter.</p>}
              </div>
            </aside>

            <article style={{ minWidth: 0, display: "grid", gap: 14 }}>
              {selectedDraft ? (
                <>
                  <section style={{ border: "1px solid #dbe2ea", borderRadius: 14, padding: 16 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: "#64748b" }}>EXTRACTED TEXT · UNVERIFIED</p>
                    <h2 style={{ fontSize: 20, margin: "0 0 12px" }}>Question {selectedDraft.displayedQuestionNumber}</h2>
                    <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: "inherit", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{selectedDraft.extractedBlock || "No extracted text was stored for this draft."}</pre>
                    {selectedDraft.warnings?.length > 0 && <ul style={{ margin: "14px 0 0", paddingLeft: 20, color: "#9a3412", fontSize: 13, lineHeight: 1.5 }}>{selectedDraft.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
                  </section>
                  <section style={{ border: "1px solid #dbe2ea", borderRadius: 14, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                      <h2 style={{ fontSize: 18, margin: 0 }}>Original PDF page · {selectedDraft.pageNumber}</h2>
                      {selectedImage && <a href={selectedImage.url} target="_blank" rel="noreferrer">Open image separately ↗</a>}
                    </div>
                    {selectedImage ? (
                      // The page PNG is a local browser object URL, not sent to a server.
                      <img src={selectedImage.url} alt={`Original PDF page ${selectedDraft.pageNumber}`} style={{ display: "block", width: "100%", height: "auto", borderRadius: 8, background: "#f1f5f9" }} />
                    ) : (
                      <div style={{ background: "#f8fafc", borderRadius: 10, padding: 18, color: "#64748b", lineHeight: 1.6 }}>
                        No matching PNG loaded. Render the original PDF page and select a file named <strong>page-{String(selectedDraft.pageNumber).padStart(2, "0")}.png</strong>. Images are matched by the number in the filename.
                      </div>
                    )}
                  </section>
                </>
              ) : <div style={{ border: "1px solid #dbe2ea", borderRadius: 14, padding: 20 }}>No draft selected.</div>}
            </article>
          </section>
        </>
      )}
      <footer style={{ marginTop: 24, borderTop: "1px solid #e2e8f0", paddingTop: 14, fontSize: 12, lineHeight: 1.6, color: "#64748b" }}>
        This tool does not edit draft JSON, verify answers, or publish questions. Check every question and answer against the original paper and official key.
      </footer>
    </main>
  );
}
