import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Simple and robust parser for standard Markdown features
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const parseInline = (text: string): React.ReactNode => {
    // Handle inline code `code`
    // Handle bold **bold**
    // Handle italic *italic*
    // Handle links [text](url)
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Inline code
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        parts.push(
          <code key={key++} className="px-1.5 py-0.5 rounded-md bg-slate-100 text-indigo-700 font-mono text-[11px] font-semibold border border-slate-200/80">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Bold **bold**
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        parts.push(<strong key={key++} className="font-bold text-slate-900">{parseInline(boldMatch[1])}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic *italic* or _italic_
      const italicMatch = remaining.match(/^\*([^*]+)\*/) || remaining.match(/^_([^_]+)_/);
      if (italicMatch) {
        parts.push(<em key={key++} className="italic text-slate-700">{parseInline(italicMatch[1])}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Link [label](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline hover:text-indigo-800 font-medium">
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Plain character
      const nextSpecial = remaining.search(/[`*_\[]/);
      if (nextSpecial === -1) {
        parts.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        parts.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return parts;
  };

  const flushTable = (k: number) => {
    if (tableHeader.length === 0 && tableRows.length === 0) return null;
    const tableElement = (
      <div key={`table-${k}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
          {tableHeader.length > 0 && (
            <thead className="bg-slate-50 font-bold text-slate-800">
              <tr>
                {tableHeader.map((th, idx) => (
                  <th key={idx} className="px-3.5 py-2.5 font-semibold">
                    {parseInline(th.trim())}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-slate-100 bg-white">
            {tableRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2 text-slate-700 font-normal">
                    {parseInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableHeader = [];
    tableRows = [];
    inTable = false;
    return tableElement;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockLines = [];
        continue;
      } else {
        inCodeBlock = false;
        elements.push(
          <div key={`code-${i}`} className="my-3 rounded-xl bg-slate-900 text-slate-100 p-3.5 font-mono text-xs overflow-x-auto shadow-sm border border-slate-800">
            {codeBlockLang && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1">
                {codeBlockLang}
              </div>
            )}
            <pre className="whitespace-pre leading-relaxed text-[11.5px]">{codeBlockLines.join('\n')}</pre>
          </div>
        );
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Markdown Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const rawCols = line.trim().slice(1, -1).split('|');
      const isDivider = rawCols.every((c) => /^\s*[-:]+\s*$/.test(c));

      if (isDivider) {
        continue; // divider row
      }

      if (!inTable) {
        inTable = true;
        tableHeader = rawCols;
      } else {
        tableRows.push(rawCols);
      }
      continue;
    } else if (inTable) {
      const tbl = flushTable(i);
      if (tbl) elements.push(tbl);
    }

    // Empty lines
    if (!line.trim()) {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-base sm:text-lg font-extrabold text-slate-900 mt-3 mb-1.5 tracking-tight">{parseInline(line.slice(2))}</h1>);
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-sm sm:text-base font-bold text-slate-900 mt-3 mb-1.5 tracking-tight">{parseInline(line.slice(3))}</h2>);
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-xs sm:text-sm font-bold text-slate-900 mt-2.5 mb-1">{parseInline(line.slice(4))}</h3>);
      continue;
    }
    if (line.startsWith('#### ')) {
      elements.push(<h4 key={i} className="text-xs font-bold text-slate-800 mt-2 mb-1">{parseInline(line.slice(5))}</h4>);
      continue;
    }

    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      elements.push(<hr key={i} className="my-3 border-slate-200/80" />);
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="my-2 border-l-3 border-indigo-500 bg-indigo-50/50 rounded-r-xl px-3.5 py-2 text-xs sm:text-[13px] text-slate-700 italic">
          {parseInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Bullet points
    if (/^\s*[-*•]\s+/.test(line)) {
      const indent = line.search(/\S/);
      const content = line.replace(/^\s*[-*•]\s+/, '');
      elements.push(
        <div key={i} className={`flex items-start gap-2 my-1 text-xs sm:text-sm text-slate-800 ${indent > 0 ? 'ml-4' : 'ml-1'}`}>
          <span className="text-indigo-500 font-bold mt-1 text-xs leading-none">•</span>
          <span className="flex-1 leading-relaxed">{parseInline(content)}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const match = line.match(/^\s*(\d+)\.\s+(.*)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex items-start gap-2 my-1.5 text-xs sm:text-sm text-slate-800 ml-1">
            <span className="font-bold text-indigo-600 shrink-0 text-xs">{match[1]}.</span>
            <span className="flex-1 leading-relaxed">{parseInline(match[2])}</span>
          </div>
        );
        continue;
      }
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="my-1 text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
        {parseInline(line)}
      </p>
    );
  }

  if (inTable) {
    const tbl = flushTable(lines.length);
    if (tbl) elements.push(tbl);
  }

  return <div className={`markdown-body space-y-1 ${className}`}>{elements}</div>;
};

export default MarkdownRenderer;
