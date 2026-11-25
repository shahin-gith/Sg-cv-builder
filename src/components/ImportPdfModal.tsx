import React, { useState } from 'react';
import { FileUp, Loader2, Upload, X } from 'lucide-react';
import { importCVFromPdfFile } from '../services/accountClient';
import { CVDocument } from '../types/cv';

interface ImportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportedCV: (cv: CVDocument) => void;
}

export const ImportPdfModal: React.FC<ImportPdfModalProps> = ({
  isOpen,
  onClose,
  onImportedCV,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please select a valid .pdf file.');
      return;
    }

    setFileName(file.name);
    setError(null);
    setLoading(true);
    try {
      const importedCV = await importCVFromPdfFile(file);
      onImportedCV(importedCV);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not read this PDF. Please verify it is a valid CV PDF under 8 MB.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Upload PDF CV to Re-Edit"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Upload PDF CV to Edit
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              PDF আপলোড করলে আপনার আগের CV-এর সব তথ্য এডিট করার জন্য খুলে যাবে।
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upload PDF dialog"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-600 hover:bg-blue-50/30 transition-colors cursor-pointer">
            {loading ? (
              <>
                <Loader2 className="w-8 h-8 text-blue-700 animate-spin mb-3" />
                <div className="text-sm font-semibold text-slate-900">
                  Reading {fileName}...
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Restoring your CV sections, template, and details for editing...
                </p>
              </>
            ) : (
              <>
                <FileUp className="w-8 h-8 text-blue-700 mb-3" />
                <div className="text-sm font-semibold text-slate-900">
                  Click to choose a CV PDF file
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Works with PDFs downloaded from CareerCraft SG (100% exact restore) or any external CV PDF (extracted with AI).
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium">
                  <Upload className="w-3.5 h-3.5" />
                  Select PDF File
                </span>
              </>
            )}
            <input
              type="file"
              accept=".pdf,application/pdf"
              disabled={loading}
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
