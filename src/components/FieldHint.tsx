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
    <div className="mt-1 text-[11px] leading-relaxed text-slate-500 space-y-0.5">
      <div>{guide.en}</div>
      {showBengali && <div className="text-slate-600">{guide.bn}</div>}
      <div className="text-slate-400">Example: {guide.example}</div>
    </div>
  );
};
