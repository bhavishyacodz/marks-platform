"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { isCorrectAnswer, questions } from "@/data/questions";

const EXAM_SECONDS = 180 * 60;
const QUESTION_MARKS = 4;
const NEGATIVE_MARKS = 1;

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map(n => String(n).padStart(2, "0")).join(":");
}

export default function MockTestPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(EXAM_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const testQuestions = useMemo(() => questions, []);
  const current = testQuestions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const markedCount = reviewIds.length;
  const unansweredCount = Math.max(0, testQuestions.length - answeredCount);
  const correctCount = testQuestions.filter(q => isCorrectAnswer(q, answers[q.id])).length;
  const incorrectCount = testQuestions.filter(q => answers[q.id] !== undefined && answers[q.id].trim() !== "" && !isCorrectAnswer(q, answers[q.id])).length;
  const score = correctCount * QUESTION_MARKS - incorrectCount * NEGATIVE_MARKS;
  const maxScore = testQuestions.length * QUESTION_MARKS;

  useEffect(() => {
    if (submitted) return;
    const timer = window.setInterval(() => setTimeLeft(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [submitted]);

  useEffect(() => {
    if (timeLeft === 0 && !submitted) setSubmitted(true);
  }, [timeLeft, submitted]);

  function chooseAnswer(optionId: string) {
    if (!current || submitted) return;
    setAnswers(previous => ({ ...previous, [current.id]: optionId }));
  }

  function toggleReview() {
    if (!current || submitted) return;
    setReviewIds(previous => previous.includes(current.id)
      ? previous.filter(id => id !== current.id)
      : [...previous, current.id]);
  }

  function submitTest() {
    setSubmitted(true);
    setConfirmSubmit(false);
  }

  if (!testQuestions.length) {
    return <main className="app-shell mock-shell"><header className="topbar"><Link className="brand" href="/"><span className="brand-mark">M</span><span>MARKS<span className="brand-dot">.</span></span></Link></header><section className="mock-empty"><h1>No questions available yet</h1><p>Add reviewed questions to the question bank before starting a mock test.</p><Link className="primary-button" href="/">Back to chapters</Link></section></main>;
  }

  return <main className="app-shell mock-shell">
    <header className="topbar mock-topbar">
      <Link className="brand" href="/"><span className="brand-mark">M</span><span>MARKS<span className="brand-dot">.</span></span></Link>
      <span className="beta-pill">MOCK TEST PREVIEW</span>
      <div className={timeLeft < 300 ? "mock-timer urgent" : "mock-timer"} aria-label="Time remaining"><span>TIME LEFT</span><strong>{formatTime(timeLeft)}</strong></div>
    </header>

    {!submitted ? <>
      <section className="mock-intro">
        <span className="section-kicker">JEE MAIN · TIMED WORKSPACE</span>
        <h1>Mock test</h1>
        <p>Use the question palette to move around, save your choices, and mark questions to review. A correct answer earns +4 and an incorrect answer earns −1.</p>
        <div className="mock-preview-warning"><strong>Preview question bank</strong><span>This repository currently contains only {testQuestions.length} original demo questions, not a complete JEE Main paper. All are practice examples, not official PYQs. The timer is set to 3 hours for testing the exam workflow.</span></div>
      </section>

      <div className="mock-layout">
        <section className="mock-question-panel">
          <div className="mock-question-head"><span>Question {currentIndex + 1} of {testQuestions.length}</span><span className="mock-subject">{current.subject}</span></div>
          <div className="mock-question-meta"><span>{current.chapter} · {current.topic}</span><span>{QUESTION_MARKS} marks</span></div>
          <h2>{current.prompt}</h2>
          <div className="options-list mock-options">{current.type === "numerical" ? <label className="numerical-answer-field"><span>Enter numerical answer</span><input type="number" inputMode="decimal" step="any" value={answers[current.id] ?? ""} onChange={event => chooseAnswer(event.target.value)} placeholder="Type your answer" aria-label="Numerical answer" /></label> : current.options.map((option, optionIndex) => <button key={option.id} className={`option ${answers[current.id] === option.id ? "chosen" : ""}`} onClick={() => chooseAnswer(option.id)}><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option.text}</span>{answers[current.id] === option.id && <span className="option-mark">✓</span>}</button>)}</div>
          <div className="mock-question-actions"><button className={reviewIds.includes(current.id) ? "review-toggle review-active" : "review-toggle"} onClick={toggleReview}>{reviewIds.includes(current.id) ? "★ Marked for review" : "☆ Mark for review"}</button><button className="mock-clear-answer" onClick={() => setAnswers(previous => { const next = { ...previous }; delete next[current.id]; return next; })} disabled={!answers[current.id]}>Clear response</button></div>
          <div className="mock-bottom-actions"><button className="secondary-button" disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)}>← Previous</button><button className="primary-button" onClick={() => setCurrentIndex(i => Math.min(testQuestions.length - 1, i + 1))} disabled={currentIndex === testQuestions.length - 1}>Save & next →</button></div>
        </section>

        <aside className="mock-palette">
          <h2>Question palette</h2>
          <p>Tap a number to visit a question.</p>
          <div className="mock-legend"><span><i className="legend-answered"/> Answered</span><span><i className="legend-review"/> Review</span><span><i className="legend-empty"/> Unanswered</span></div>
          <div className="mock-palette-grid">{testQuestions.map((q, i) => <button key={q.id} aria-label={`Go to question ${i + 1}`} className={`palette-number ${answers[q.id] ? "has-answer" : ""} ${reviewIds.includes(q.id) ? "has-review" : ""} ${currentIndex === i ? "is-current" : ""}`} onClick={() => setCurrentIndex(i)}>{i + 1}</button>)}</div>
          <div className="mock-counts"><div><span>Answered</span><strong>{answeredCount}</strong></div><div><span>Unanswered</span><strong>{unansweredCount}</strong></div><div><span>Review flags</span><strong>{markedCount}</strong></div></div>
          <button className="primary-button full-button" onClick={() => setConfirmSubmit(true)}>Submit test</button>
          <Link className="mock-exit-link" href="/">Exit to MARKS home</Link>
        </aside>
      </div>
      {confirmSubmit && <div className="mock-confirm-backdrop" role="presentation"><section className="mock-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="submit-title"><h2 id="submit-title">Submit this test?</h2><p>You have answered {answeredCount} of {testQuestions.length} questions and have {unansweredCount} unanswered. You can still return to the test.</p><div><button className="secondary-button" onClick={() => setConfirmSubmit(false)}>Keep working</button><button className="primary-button" onClick={submitTest}>Confirm submit</button></div></section></div>}
    </> : <section className="mock-results">
      <span className="section-kicker">SESSION SUMMARY</span>
      <h1>Test submitted</h1>
      <p className="mock-results-subtitle">Your score is calculated from the current demo question bank. This result is not saved to an account.</p>
      <div className="mock-score"><strong>{score}</strong><span>out of {maxScore} marks</span></div>
      <div className="mock-results-grid"><div><strong>{correctCount}</strong><span>Correct · +{correctCount * QUESTION_MARKS}</span></div><div><strong>{incorrectCount}</strong><span>Incorrect · −{incorrectCount * NEGATIVE_MARKS}</span></div><div><strong>{unansweredCount}</strong><span>Unanswered · 0</span></div><div><strong>{markedCount}</strong><span>Marked for review</span></div></div>
      <div className="mock-results-list"><h2>Review your answers</h2>{testQuestions.map((q, i) => <article key={q.id} className="mock-review-item"><div><strong>Q{i + 1} · {q.subject}</strong><span>{q.prompt}</span></div><span className={answers[q.id] === q.answer ? "result-correct" : answers[q.id] ? "result-incorrect" : "result-unanswered"}>{isCorrectAnswer(q, answers[q.id]) ? "Correct" : answers[q.id] !== undefined && answers[q.id].trim() !== "" ? "Incorrect" : "Unanswered"}</span><p>Your answer: {answers[q.id] === undefined || answers[q.id].trim() === "" ? "Not answered" : q.type === "numerical" ? answers[q.id] : q.options.find(o => o.id === answers[q.id])?.text ?? "Not answered"}</p><p>Correct answer: {q.type === "numerical" ? q.answer : q.options.find(o => o.id === q.answer)?.text}</p><p>{q.solution}</p></article>)}</div>
      <div className="mock-results-actions"><button className="primary-button" onClick={() => { setCurrentIndex(0); setAnswers({}); setReviewIds([]); setTimeLeft(EXAM_SECONDS); setSubmitted(false); }}>Restart preview</button><Link className="secondary-button" href="/">Back to MARKS home</Link></div>
      <p className="mock-preview-footnote">This is a workflow preview using {testQuestions.length} demo questions, not a complete JEE Main mock paper. Results are temporary.</p>
    </section>}
  </main>;
}
