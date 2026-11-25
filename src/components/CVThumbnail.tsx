import React from 'react';
import { CVDocument } from '../types/cv';
import { CVDocumentRenderer } from './CVDocumentRenderer';

interface CVThumbnailProps {
  cv: CVDocument;
  heightClass?: string;
}

export const CVThumbnail: React.FC<CVThumbnailProps> = ({
  cv,
  heightClass = 'h-56',
}) => {
  const scale = 0.37;
  return (
    <div
      aria-hidden="true"
      className={`relative w-full ${heightClass} bg-slate-100 border-b border-slate-200 overflow-hidden select-none flex justify-center pt-3`}
    >
      <div
        className="pointer-events-none shrink-0"
        style={{
          width: `${210 * scale}mm`,
          height: `${297 * scale}mm`,
        }}
      >
        <div
          className="origin-top-left"
          style={{
            width: '210mm',
            transform: `scale(${scale})`,
          }}
        >
          <CVDocumentRenderer cv={cv} />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-100/95 to-transparent pointer-events-none" />
    </div>
  );
};
