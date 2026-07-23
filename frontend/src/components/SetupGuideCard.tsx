import React, { useState } from 'react';
import { HelpCircle, ExternalLink, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import type { SetupGuide } from '@qona/shared';

interface SetupGuideCardProps {
  guide: SetupGuide;
  onFilled?: () => void;
}

export const SetupGuideCard: React.FC<SetupGuideCardProps> = ({ guide }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="my-3 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-4 shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between font-semibold text-indigo-950 hover:text-indigo-700 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4.5 w-4.5 text-indigo-600" />
          <span className="text-xs sm:text-sm font-bold">{guide.title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-indigo-400" /> : <ChevronDown className="h-4 w-4 text-indigo-400" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2.5 border-t border-indigo-100/60 pt-3 text-xs text-slate-700">
          {guide.summary && (
            <p className="font-medium text-slate-600 leading-relaxed">{guide.summary}</p>
          )}

          <div className="space-y-2 rounded-lg bg-white p-3 border border-indigo-50 shadow-2xs">
            {guide.steps.map((step, idx) => {
              const text = typeof step === 'string' ? step : step.instruction;
              return (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed font-medium text-slate-800">{text}</span>
                </div>
              );
            })}
          </div>

          {guide.docUrl && (
            <div className="pt-1">
              <a
                href={guide.docUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                <span>Official Documentation</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
