"use client";

import { useMemo } from "react";
import katex from "katex";

type MathFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  border: "1px solid #dfe4ee",
  borderRadius: 12,
  background: "#fff",
  color: "#172033",
  font: "inherit",
  lineHeight: 1.55,
  resize: "vertical" as const,
};

function renderInlineMath(text: string) {
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g);
  return parts.map((part, index) => {
    const display = part.startsWith("$$") && part.endsWith("$$");
    const inline = !display && part.startsWith("$") && part.endsWith("$");
    if (!display && !inline) return <span key={index} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
    const source = part.slice(display ? 2 : 1, display ? -2 : -1);
    try {
      const html = katex.renderToString(source, { displayMode: display, throwOnError: false, strict: "ignore" });
      return <span key={index} style={display ? { display: "block", overflowX: "auto", padding: "8px 0" } : undefined} dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <span key={index} style={{ color: "#b42318" }}>{part}</span>;
    }
  });
}

export default function MathField({ label, value, onChange, rows = 4, required = false }: MathFieldProps) {
  const preview = useMemo(() => renderInlineMath(value || "Your preview will appear here."), [value]);
  const insert = (snippet: string) => onChange(value + snippet);

  return (
    <div style={{ display: "grid", gap: 7, fontSize: 13, fontWeight: 650, color: "#47516a" }}>
      <label>{label}{required ? " *" : ""}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {[
          ["Fraction", "$\\frac{a}{b}$"],
          ["Square root", "$\\sqrt{x}$"],
          ["Power", "$x^{2}$"],
          ["Subscript", "$x_{1}$"],
          ["×", "$\\times$"],
          ["π", "$\\pi$"],
          ["Display formula", "\n$$\\frac{a}{b}$$\n"],
        ].map(([title, snippet]) => (
          <button key={title} type="button" onClick={() => insert(snippet)} style={{ border: "1px solid #dfe4ee", borderRadius: 9, background: "#f8f9fc", padding: "7px 9px", color: "#344054", fontSize: 12, fontWeight: 650 }}>
            {title}
          </button>
        ))}
      </div>
      <textarea required={required} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle} placeholder="Type normal text; wrap math in $...$ or $$...$$" />
      <div style={{ border: "1px solid #e7eaf2", borderRadius: 12, padding: 12, background: "#fbfcff", color: "#172033", fontSize: 14, fontWeight: 400, lineHeight: 1.7, overflowX: "auto" }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#7b8497", fontWeight: 800, marginBottom: 5 }}>Live preview</div>
        {preview}
      </div>
    </div>
  );
}
