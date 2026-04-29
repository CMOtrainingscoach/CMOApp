"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function TheoryBody({ markdown }: { markdown: string }) {
  return (
    <div className="prose-strategy">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      <style jsx>{`
        .prose-strategy :global(h1) {
          font-family: "EB Garamond", "Cormorant Garamond", serif;
          font-size: 2rem;
          line-height: 1.15;
          color: #f5e9b5;
          margin-top: 0;
          margin-bottom: 1.25rem;
          letter-spacing: -0.01em;
        }
        .prose-strategy :global(h2) {
          font-family: "EB Garamond", "Cormorant Garamond", serif;
          font-size: 1.5rem;
          line-height: 1.2;
          color: #e8c66e;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
        }
        .prose-strategy :global(h3) {
          font-size: 1.05rem;
          font-weight: 600;
          color: #e8c66e;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .prose-strategy :global(p) {
          color: #d6d6d6;
          line-height: 1.75;
          margin: 0.85rem 0;
        }
        .prose-strategy :global(strong) {
          color: #f5e9b5;
          font-weight: 600;
        }
        .prose-strategy :global(em) {
          color: #c9b582;
        }
        .prose-strategy :global(ul),
        .prose-strategy :global(ol) {
          margin: 0.75rem 0 1rem 1.25rem;
          color: #d0d0d0;
        }
        .prose-strategy :global(li) {
          margin: 0.35rem 0;
          line-height: 1.65;
        }
        .prose-strategy :global(li::marker) {
          color: #d4af37;
        }
        .prose-strategy :global(blockquote) {
          border-left: 2px solid rgba(212, 175, 55, 0.45);
          padding-left: 1rem;
          color: #c0c0c0;
          font-style: italic;
          margin: 1rem 0;
        }
        .prose-strategy :global(code) {
          background: rgba(212, 175, 55, 0.10);
          color: #f5e9b5;
          padding: 0.1rem 0.35rem;
          border-radius: 0.35rem;
          font-size: 0.85em;
        }
        .prose-strategy :global(hr) {
          border: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(212, 175, 55, 0.3) 50%,
            transparent 100%
          );
          margin: 2rem 0;
        }
        .prose-strategy :global(a) {
          color: #e8c66e;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </div>
  );
}
