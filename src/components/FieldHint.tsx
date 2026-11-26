import React from 'react';
import { FIELD_GUIDES } from '../data/fieldGuides';

interface FieldHintProps {
  guideKey: keyof typeof FIELD_GUIDES;
  visible?: boolean;
  showBengali?: boolean;
}

export const FieldHint: React.FC<FieldHintProps> = ({
  guideKey,
  visible = false,
  showBengali = false,
}) => {
  if (!visible) return null;
  const guide = FIELD_GUIDES[guideKey];
  if (!guide) return null;

  return (
    <p className="mt-1 text-[11px] leading-snug text-slate-500">
      {showBengali ? guide.bn : guide.en}
    </p>
  );
};
