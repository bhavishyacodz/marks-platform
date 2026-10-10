"use client";

import { useMemo, useState } from "react";
import { chapters, demoQuestion, subjects, type Subject } from "@/data/demo";

export default function Home() {
  const [subject, setSubject] = useState<Subject>("Physics");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);

  const visibleChapters = useMemo(() => chapters.filter((chapter) =>
    chapter.subject === subject && chapter.name.toLowerCase().includes(query.toLowerCase())
  ), [subject, query]);

  const openQuestion = () => {
    setSelected(null);
    setChecked(false);
    setShowQuestion(true);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="MARKS home"><span className="brand-mark">M</span><span>MARKS<span className="brand-dot">.</span></span></a>
        <span className="beta-pill">BETA PREVIEW</span>
        <button className="avatar" aria-label="Profile preview">S</button>
      </header>

      <section className="welcome">
        <div className="eyebrow"><span className="eyebrow-dot" /> YOUR JEE MAIN WORKSPACE</div>
        <h1>Small steps.<br /><span>Big results.</span></h1>
        <p className="welcome-copy">A clearer way to practice, review, and build consistency — one question at a time.</p>
        <div className="stats-row">
          <div className="stat-card"><span className="stat-icon blue">◎</span><div><strong>82</strong><span>Sample question count</span></div></div>
          <div className="stat-card"><span className="stat-icon green">↗</span><div><strong>12%</strong><span>Illustrative progress</span></div></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="section-kicker">YOUR SYLLABUS</span><h2>Choose a subject</h2></div><span className="muted-small">Sample data</span></div>
        <div className="subject-tabs" role="tablist" aria-label="Subjects">
          {subjects.map((item) => <button key={item.name} role="tab" aria-selected={subject === item.name} className={`subject-tab ${subject === item.name ? "active" : ""}`} onClick={() => setSubject(item.name)}><span className="subject-short">{item.short}</span><span className="subject-name">{item.name}</span><span className="subject-count">{item.count} sample Qs</span></button>)}
        </div>
      </section>

      <section className="section-block chapter-section">
        <div className="section-heading"><div><span className="section-kicker">KEEP THE MOMENTUM</span><h2>Chapter practice</h2></div><span className="count-badge">{visibleChapters.length} chapters</span></div>
        <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chapters..." />{query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}</label>
        <div className="chapter-list">
          {visibleChapters.map((chapter, index) => <button className="chapter-card" key={chapter.name} onClick={openQuestion}><span className={`chapter-symbol symbol-${index % 4}`}>{["◈", "↗", "⌁", "∑"][index % 4]}</span><span className="chapter-info"><strong>{chapter.name}</strong><span>{chapter.questions} sample questions</span><span className="progress-track"><span style={{ width: `${chapter.progress}%` }} /></span></span><span className="chapter-end"><span>{chapter.progress}%</span><b>›</b></span></button>)}
          {visibleChapters.length === 0 && <div className="empty-state">No chapters match that search.</div>}
        </div>
      </section>

      <section className="featured-card"><div className="featured-top"><span className="featured-label">QUICK PRACTICE</span><span className="sparkle">✦</span></div><h2>One question can<br />change your day.</h2><p>Try a sample question with an explanation and answer check.</p><button className="primary-button" onClick={openQuestion}>Start a demo question <span>→</span></button></section>

      {showQuestion && <div className="modal-backdrop" role="presentation" onClick={() => setShowQuestion(false)}><section className="question-modal" role="dialog" aria-modal="true" aria-labelledby="question-title" onClick={(event) => event.stopPropagation()}><div className="modal-head"><span className="section-kicker">PHYSICS · RAY OPTICS</span><button className="close-button" onClick={() => setShowQuestion(false)} aria-label="Close question">×</button></div><span className="demo-warning">{demoQuestion.sourceLabel}</span><h2 id="question-title">{demoQuestion.prompt}</h2><div className="formula-card">1/f = 1/v − 1/u<span>Thin lens formula</span></div><div className="options-list">{demoQuestion.options.map((option) => { const isCorrect = option.id === demoQuestion.correctOptionId; const isChosen = selected === option.id; return <button key={option.id} disabled={checked} className={`option ${isChosen ? "chosen" : ""} ${checked && isCorrect ? "correct" : ""} ${checked && isChosen && !isCorrect ? "incorrect" : ""}`} onClick={() => setSelected(option.id)}><span className="option-letter">{option.id.toUpperCase()}</span><span>{option.text}</span>{checked && isCorrect && <span className="option-mark">✓</span>}</button>; })}</div>{checked && <div className={`answer-explanation ${selected === demoQuestion.correctOptionId ? "success" : "review"}`}><strong>{selected === demoQuestion.correctOptionId ? "Correct answer!" : "Let’s review the method"}</strong><p>{demoQuestion.explanation}</p></div>}{!checked ? <button className="primary-button full-button" disabled={!selected} onClick={() => setChecked(true)}>Check answer <span>✓</span></button> : <button className="primary-button full-button" onClick={() => { setShowQuestion(false); setSelected(null); setChecked(false); }}>Back to dashboard <span>→</span></button>}</section></div>}

      <nav className="bottom-nav" aria-label="Main navigation"><a className="nav-item active" href="#"><span>⌂</span>Home</a><button className="nav-item" onClick={() => document.querySelector(".chapter-section")?.scrollIntoView({ behavior: "smooth" })}><span>▦</span>Chapters</button><button className="nav-item" onClick={openQuestion}><span>◎</span>Practice</button><button className="nav-item" onClick={() => window.alert("Progress saving will be added in a later step.")}><span>▥</span>Progress</button></nav>
      <footer className="footer-note">Built for focused practice <span>·</span> MARKS starter v0.1</footer>
    </main>
  );
}
