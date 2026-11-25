import React from 'react';
import { FIELD_GUIDES } from '../data/fieldGuides';

interface FieldHintProps {
  guideKey: keyof typeof FIELD_GUIDES;
  visible?: boolean;
  showBengali?: boolean;
}

export const FieldHint: React.FC<FieldHintProps> = ({
  guideKey,
  visible = true,
  showBengali = true,
}) => {
  if (!visible) return null;
  const guide = FIELD_GUIDES[guideKey];
  if (!guide) return null;

  return (
    <div className="mt-1.5 rounded-lg bg-sky-50/90 border border-sky-200/80 px-2.5 py-2 text-[11px] leading-relaxed text-slate-700 space-y-0.5">
      <div className="font-medium text-slate-800">{guide.en}</div>
      {showBengali && <div className="text-sky-900">{guide.bn}</div>}
      <div className="text-slate-600">
        <span className="font-semibold text-slate-700">Example:</span> {guide.example}
      </div>
    </div>
  );
};
