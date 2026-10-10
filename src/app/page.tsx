"use client";

import { useEffect, useMemo, useState } from "react";
import { subjects, type Subject } from "@/data/demo";
import { syllabusCatalogue } from "@/data/syllabus";
import { isCorrectAnswer, questions } from "@/data/questions";


type View = "chapters" | "topics" | "questions" | "practice" | "results" | "mistakebook" | "reviewqueue";

const PROGRESS_STORAGE_KEY = "marks-practice-progress-v1";

export default function Home() {
  const [subject, setSubject] = useState<Subject>("Physics");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("chapters");
  const [activeChapter, setActiveChapter] = useState<string>("Optics");
  const [activeTopic, setActiveTopic] = useState("All topics");
  const [year, setYear] = useState("All years");
  const [sourceFilter, setSourceFilter] = useState("All sources");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [attempts, setAttempts] = useState<Record<string, boolean>>({});
  const [markedForReview, setMarkedForReview] = useState<string[]>([]);
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          const data = parsed as { attempts?: unknown; markedForReview?: unknown };
          if (data.attempts && typeof data.attempts === "object" && !Array.isArray(data.attempts)) {
            const validAttempts = Object.entries(data.attempts as Record<string, unknown>).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean");
            setAttempts(Object.fromEntries(validAttempts));
          }
          if (Array.isArray(data.markedForReview)) {
            setMarkedForReview(data.markedForReview.filter((id): id is string => typeof id === "string"));
          }
        }
      }
    } catch {
      // Ignore invalid or unavailable saved data and continue with an empty session.
    } finally {
      setProgressLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!progressLoaded) return;
    try {
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ attempts, markedForReview }));
    } catch {
      // The app remains usable if browser storage is disabled or full.
    }
  }, [attempts, markedForReview, progressLoaded]);

  const answeredCount = Object.keys(attempts).length;
  const correctCount = Object.values(attempts).filter(Boolean).length;

  const visibleChapters = useMemo(() => syllabusCatalogue.filter(c => c.subject === subject && c.chapter.toLowerCase().includes(query.toLowerCase())), [subject, query]);
  const chapterQuestions = useMemo(() => questions.filter(q => q.subject === subject && q.chapter === activeChapter && (activeTopic === "All topics" || q.topic === activeTopic) && (year === "All years" || String(q.year) === year) && (sourceFilter === "All sources" || (sourceFilter === "Verified official PYQs" ? q.status === "verified" : q.status === "unverified"))), [subject, activeChapter, activeTopic, year, sourceFilter]);
  const current = chapterQuestions[index];
  const mistakeQuestions = questions.filter(q => attempts[q.id] === false);
  const reviewQuestions = questions.filter(q => markedForReview.includes(q.id));

  function openChapter(chapter: string) {
    setActiveChapter(chapter); setActiveTopic("All topics"); setYear("All years"); setSourceFilter("All sources"); setIndex(0); setSelected(null); setChecked(false); setView("topics");
  }
  function resetPracticeSession() {
    setAttempts({});
    setMarkedForReview([]);
    setIndex(0);
    setSelected(null);
    setChecked(false);
  }
  function startPractice() {
    const available = questions.filter(q => q.subject === subject && q.chapter === activeChapter);
    if (available.length) { setActiveTopic("All topics"); setYear("All years"); setSourceFilter("All sources"); setIndex(0); setSelected(null); setChecked(false); setView("practice"); }
    else setView("questions");
  }
  function goToQuestion(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= chapterQuestions.length) return;
    setIndex(nextIndex);
    setSelected(null);
    setChecked(false);
  }
  function nextQuestion() {
    if (index + 1 < chapterQuestions.length) goToQuestion(index + 1);
    else setView("results");
  }
  function toggleReview() {
    if (!current) return;
    setMarkedForReview(items => items.includes(current.id) ? items.filter(id => id !== current.id) : [...items, current.id]);
  }
  const syllabusTopics = syllabusCatalogue.find(c => c.subject === subject && c.chapter === activeChapter)?.topics ?? [];
  const questionTopics = questions.filter(q => q.subject === subject && q.chapter === activeChapter).map(q => q.topic);
  const topics = Array.from(new Set([...syllabusTopics, ...questionTopics]));

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#" onClick={(e) => {e.preventDefault();setView("chapters");}}><span className="brand-mark">M</span><span>MARKS<span className="brand-dot">.</span></span></a><span className="beta-pill">BETA PREVIEW</span><span className="avatar" aria-label="Profile preview">S</span></header>
    <section className="welcome"><div className="eyebrow"><span className="eyebrow-dot"/> JEE MAIN PRACTICE WORKSPACE</div><h1>Practice smart.<br/><span>Track every step.</span></h1><p className="welcome-copy">Explore chapters, filter question sets by year and shift, and review solutions. Official PYQs are only marked verified after source checking.</p><div className="stats-row"><div className="stat-card"><span className="stat-icon blue">▦</span><div><strong>{syllabusCatalogue.length}</strong><span>Syllabus chapter entries</span></div></div><div className="stat-card"><span className="stat-icon green">✓</span><div><strong>{questions.filter(q=>q.status==="verified").length}</strong><span>Verified PYQs in this starter</span></div></div></div></section>
    <section className="section-block"><div className="section-heading"><div><span className="section-kicker">STEP 1</span><h2>Choose a subject</h2></div><span className="muted-small">Syllabus catalogue · starter</span></div><div className="subject-tabs" role="tablist" aria-label="Subjects">{subjects.map(item=><button key={item.name} role="tab" aria-selected={subject===item.name} className={`subject-tab ${subject===item.name?"active":""}`} onClick={()=>{setSubject(item.name);setQuery("");setView("chapters");}}><span className="subject-short">{item.short}</span><span className="subject-name">{item.name}</span><span className="subject-count">{syllabusCatalogue.filter(c=>c.subject===item.name&&questions.some(q=>q.subject===c.subject&&q.chapter===c.chapter)).length}/{syllabusCatalogue.filter(c=>c.subject===item.name).length} chapters with questions</span></button>)}</div></section>
    <section className="section-block chapter-section"><div className="section-heading"><div><span className="section-kicker">{view==="chapters"?"STEP 2":"CURRENT WORKFLOW"}</span><h2>{view==="chapters"?"Chapter practice":view==="topics"?activeChapter:view==="questions"?"Question sets":view==="practice"?"Practice question":view==="results"?"Test results":activeChapter}</h2></div>{view!=="chapters"&&<button className="back-link" onClick={()=>setView(view==="practice"?"questions":view==="questions"?"topics":"chapters")}>← Back</button>}</div>
    {view==="chapters"&&<><label className="search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search chapters..."/>{query&&<button onClick={()=>setQuery("")} aria-label="Clear search">×</button>}</label><div className="chapter-list">{visibleChapters.map((c,i)=><button className="chapter-card" key={c.id} onClick={()=>openChapter(c.chapter)}><span className={`chapter-symbol symbol-${i%4}`}>{["◈","↗","⌁","∑"][i%4]}</span><span className="chapter-info"><strong>{c.chapter}</strong><span>{questions.filter(q => q.subject === c.subject && q.chapter === c.chapter).length} question(s) available · syllabus topics listed</span></span><span className="chapter-end"><span>{c.topics.length} topics</span><b>›</b></span></button>)}{!visibleChapters.length&&<div className="empty-state">No chapters match that search.</div>}</div></>}
    {view==="topics"&&<><div className="notice-card"><strong>Question-source policy</strong><p>Only source-checked questions will be labelled as verified official JEE Main PYQs. This starter currently contains practice examples, not verified official PYQs.</p></div><div className="topic-grid"><button className="topic-card" onClick={()=>{setActiveTopic("All topics");setView("questions");}}>All topics <span>{questions.filter(q=>q.subject===subject&&q.chapter===activeChapter).length} question(s) · Browse all available →</span></button>{topics.map(t=>{const count=questions.filter(q=>q.subject===subject&&q.chapter===activeChapter&&q.topic===t).length;return <button className="topic-card" key={t} disabled={count===0} onClick={()=>{setActiveTopic(t);setView("questions");}}>{t}<span>{count>0?`${count} question(s) · Practice this topic →`:"No questions yet · Coming soon"}</span></button>;})}</div><button className="primary-button full-button" onClick={startPractice}>Start chapter practice <span>→</span></button></>}
    {(view==="questions"||view==="practice")&&<><div className="filter-row"><label><span>Year</span><select value={year} onChange={e=>{setYear(e.target.value);setIndex(0);}}><option>All years</option><option>2025</option><option>2024</option><option>2023</option><option>2022</option><option>2021</option></select></label><label><span>Source</span><select value={sourceFilter} onChange={e=>{setSourceFilter(e.target.value);setIndex(0);}}><option>All sources</option><option>Verified official PYQs</option><option>Practice / unverified</option></select></label></div><div className="source-legend"><span className="unverified-pill">Practice / unverified</span><span>Year and shift labels are not proof of official origin.</span></div>{chapterQuestions.length===0?<div className="empty-state">No questions match these filters yet. Verified official PYQs will appear here after their source and shift are checked.</div>:view==="questions"?<div className="question-set-list">{chapterQuestions.map((q,i)=><button key={q.id} className="question-set-card" onClick={()=>{setIndex(i);setSelected(null);setChecked(false);setView("practice");}}><span className="question-number">{String(i+1).padStart(2,"0")}</span><span className="chapter-info"><strong>{q.topic}</strong><span>{q.year ?? "Practice only"} · {q.shift} · {q.difficulty}</span><span className="unverified-pill">{q.status==="verified"?"Verified official PYQ":"Practice / unverified"}</span>{Object.prototype.hasOwnProperty.call(attempts,q.id)&&<span className={attempts[q.id]?"result-correct":"result-incorrect"}>{attempts[q.id]?"✓ Answered correctly":"✕ Answered incorrectly"}</span>}{markedForReview.includes(q.id)&&<span className="result-unanswered">★ Marked for review</span>}</span><b>›</b></button>)}</div>:current&&<div className="practice-card"><div className="question-meta"><span>{current.subject} · {current.chapter}</span><span>{index+1} / {chapterQuestions.length}</span></div><div className="source-legend"><span>Session: {correctCount}/{answeredCount} correct</span><span>·</span><span>{current.difficulty}</span></div><div className="question-navigation" aria-label="Question navigation">{chapterQuestions.map((q,i)=><button key={q.id} aria-label={`Go to question ${i+1}`} className={`question-nav-dot ${i===index?"current":""} ${markedForReview.includes(q.id)?"review-marked":""} ${Object.prototype.hasOwnProperty.call(attempts,q.id)?"answered":""}`} onClick={()=>goToQuestion(i)}>{i+1}</button>)}</div><button className={`review-toggle ${current&&markedForReview.includes(current.id)?"review-active":""}`} onClick={toggleReview}>{current&&markedForReview.includes(current.id)?"★ Marked for review":"☆ Mark for review"}</button><span className={current.status==="verified"?"verified-pill":"unverified-pill"}>{current.source}</span><h3>{current.prompt}</h3>{current.subject==="Physics"&&current.chapter==="Optics"&&current.topic==="Lenses and lens formula"&&<div className="formula-card">1/f = 1/v − 1/u<span>Thin lens formula · Cartesian sign convention</span></div>}<div className="options-list">{current.type==="numerical"?<label className="numerical-answer-field"><span>Enter numerical answer</span><input type="number" inputMode="decimal" step="any" value={selected??""} disabled={checked} onChange={e=>setSelected(e.target.value)} placeholder="Type your answer" aria-label="Numerical answer"/></label>:current.options.map(o=><button key={o.id} disabled={checked} className={`option ${selected===o.id?"chosen":""} ${checked&&o.id===current.answer?"correct":""} ${checked&&selected===o.id&&o.id!==current.answer?"incorrect":""}`} onClick={()=>setSelected(o.id)}><span className="option-letter">{o.id.toUpperCase()}</span><span>{o.text}</span>{checked&&o.id===current.answer&&<span className="option-mark">✓</span>}</button>)}</div>{checked&&<div className={`answer-explanation ${isCorrectAnswer(current,selected??undefined)?"success":"review"}`}><strong>{isCorrectAnswer(current,selected??undefined)?"Correct answer":"Review the solution"}</strong><p>{current.solution}</p></div>}{!checked?<button className="primary-button full-button" disabled={!selected} onClick={()=>{setChecked(true);setAttempts(prev=>({...prev,[current.id]:isCorrectAnswer(current,selected??undefined)}));}}>Check answer <span>✓</span></button>:<button className="primary-button full-button" onClick={nextQuestion}>{index+1===chapterQuestions.length?"Finish practice":"Next question"} <span>→</span></button>}<div className="practice-secondary-actions"><button onClick={()=>goToQuestion(index-1)} disabled={index===0}>← Previous</button><button onClick={()=>{if(index+1<chapterQuestions.length)goToQuestion(index+1);else setView("results");}}>{index+1===chapterQuestions.length?"Finish":"Skip →"}</button></div><button className="finish-link" onClick={()=>setView("results")}>Finish session and view results</button></div>}</>}
    </section>
    {view==="reviewqueue"&&<section className="section-block results-card"><div className="results-icon">★</div><h2>Review Queue</h2><p className="results-subtitle">Your saved questions to revisit. Remove a question from this queue with the review toggle while practicing it.</p><div className="results-stats"><div><strong>{reviewQuestions.length}</strong><span>To review</span></div></div>{reviewQuestions.length===0?<div className="empty-state">Your review queue is empty. Open a question and tap “Mark for review” to add it here.</div>:<div className="question-set-list">{reviewQuestions.map((q,i)=><button key={q.id} className="question-set-card" onClick={()=>{setSubject(q.subject);setActiveChapter(q.chapter);setActiveTopic(q.topic);setYear("All years");setSourceFilter("All sources");setIndex(0);setSelected(null);setChecked(false);setView("practice");}}><span className="question-number">{String(i+1).padStart(2,"0")}</span><span className="chapter-info"><strong>{q.topic}</strong><span>{q.subject} · {q.chapter}</span><span className="result-unanswered">★ Marked for review</span>{Object.prototype.hasOwnProperty.call(attempts,q.id)&&<span className={attempts[q.id]?"result-correct":"result-incorrect"}>{attempts[q.id]?"✓ Answered correctly":"✕ Answered incorrectly"}</span>}</span><b>›</b></button>)}</div>}<button className="back-link results-home" onClick={()=>setView("chapters")}>Back to chapters</button></section>}
    {view==="mistakebook"&&<section className="section-block results-card"><div className="results-icon">↻</div><h2>Mistake Book</h2><p className="results-subtitle">Questions you answered incorrectly are collected here. Retry a question after reviewing its solution. Your list is saved on this device.</p><div className="results-stats"><div><strong>{mistakeQuestions.length}</strong><span>Mistakes</span></div><div><strong>{mistakeQuestions.filter(q=>markedForReview.includes(q.id)).length}</strong><span>Also marked</span></div></div>{mistakeQuestions.length===0?<div className="empty-state">No mistakes saved yet. Answer a practice question incorrectly and it will appear here.</div>:<div className="question-set-list">{mistakeQuestions.map((q,i)=><button key={q.id} className="question-set-card" onClick={()=>{setSubject(q.subject);setActiveChapter(q.chapter);setActiveTopic(q.topic);setYear("All years");setSourceFilter("All sources");setIndex(0);setSelected(null);setChecked(false);setView("practice");}}><span className="question-number">{String(i+1).padStart(2,"0")}</span><span className="chapter-info"><strong>{q.topic}</strong><span>{q.subject} · {q.chapter}</span><span className="result-incorrect">✕ Previously answered incorrectly</span></span><b>›</b></button>)}</div>}<button className="back-link results-home" onClick={()=>setView("chapters")}>Back to chapters</button></section>}
    {view==="results"&&<section className="section-block results-card"><div className="results-icon">✓</div><h2>Practice summary</h2><p className="results-subtitle">Here is your current session summary. Your progress and review marks are saved on this device. They are not synced to an account.</p><div className="results-stats"><div><strong>{answeredCount}</strong><span>Answered</span></div><div><strong>{correctCount}</strong><span>Correct</span></div><div><strong>{answeredCount-correctCount}</strong><span>Incorrect</span></div><div><strong>{markedForReview.length}</strong><span>Marked for review</span></div></div><div className="results-note">{answeredCount===0?"You did not check any answers in this session yet.":`Accuracy: ${Math.round((correctCount/answeredCount)*100)}% of checked answers.`} Questions you skipped are not counted as incorrect.</div><button className="primary-button full-button" onClick={()=>{setView("practice");setIndex(0);setSelected(null);setChecked(false);}}>Review questions <span>→</span></button><button className="back-link results-home" onClick={()=>{resetPracticeSession();setView("chapters");}}>Start a fresh session</button><button className="back-link results-home" onClick={()=>{setView("chapters");setIndex(0);}}>Back to chapters</button></section>}
    <section className="mock-launch-card"><div><span className="featured-label">EXAM MODE</span><h2>Ready for a timed mock?</h2><p>Try the mock-test workspace with a countdown, question palette, review flags, and a results report. The current bank is still demo-sized.</p></div><button className="primary-button full-button" onClick={()=>{window.location.href="/mock-test";}}>Open mock-test mode <span>→</span></button></section>
    <section className="featured-card"><div className="featured-top"><span className="featured-label">SOURCE TRANSPARENCY</span><span className="sparkle">✦</span></div><h2>Verified means verified.</h2><p>No invented exam shifts or false PYQ labels. Practice content stays clearly marked until an official source is checked.</p><button className="primary-button" onClick={()=>{setView("chapters");window.scrollTo({top:0,behavior:"smooth"});}}>Back to chapters <span>→</span></button></section>
    <nav className="bottom-nav" aria-label="Main navigation"><button className={`nav-item ${view==="chapters"?"active":""}`} onClick={()=>setView("chapters")}><span>⌂</span>Home</button><button className={`nav-item ${view==="chapters"||view==="topics"?"active":""}`} onClick={()=>setView("chapters")}><span>▦</span>Chapters</button><button className={`nav-item ${view==="practice"||view==="questions"?"active":""}`} onClick={()=>{if(questions.some(q=>q.subject===subject&&q.chapter===activeChapter)){setView("questions");}else{setActiveChapter(questions.find(q=>q.subject===subject)?.chapter??"");setView("questions");}}}><span>◎</span>Practice</button><button className={`nav-item ${view==="mistakebook"?"active":""}`} onClick={()=>setView("mistakebook")}><span>↻</span>Mistakes</button><button className={`nav-item ${view==="reviewqueue"?"active":""}`} onClick={()=>setView("reviewqueue")}><span>★</span>Review</button><button className={`nav-item ${view==="results"?"active":""}`} onClick={()=>setView("results")}><span>▥</span>Progress</button></nav><footer className="footer-note">MARKS · question engine v0.3 · sample catalogue</footer>
  </main>;
}
