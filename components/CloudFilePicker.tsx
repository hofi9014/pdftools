'use client';
import { useState } from 'react';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

interface CloudFilePickerProps {
  onFilesPicked: (files: File[]) => void;
  accept?: string;
  label?: string;
}

export default function CloudFilePicker({ onFilesPicked, accept = '.pdf', ...props }: CloudFilePickerProps) {
  const { locale } = useLocale();
  const label = props.label ?? t('cloud.add', locale);
  const [open, setOpen] = useState(false);

  const handleGoogleDrive = () => {
    setOpen(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = true;
    input.onchange = (e) => {
      const fls = (e.target as HTMLInputElement).files;
      if (fls) onFilesPicked(Array.from(fls));
    };
    input.click();
  };

  const handleDropbox = () => {
    setOpen(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = true;
    input.onchange = (e) => {
      const fls = (e.target as HTMLInputElement).files;
      if (fls) onFilesPicked(Array.from(fls));
    };
    input.click();
  };

  const handleOneDrive = () => {
    setOpen(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = true;
    input.onchange = (e) => {
      const fls = (e.target as HTMLInputElement).files;
      if (fls) onFilesPicked(Array.from(fls));
    };
    input.click();
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700 transition whitespace-nowrap"
      >
        ☁️ {label}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 min-w-[200px] overflow-hidden">
          <button onClick={handleGoogleDrive} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <span className="text-lg">📁</span> Google Drive
          </button>
          <button onClick={handleDropbox} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <span className="text-lg">📦</span> Dropbox
          </button>
          <button onClick={handleOneDrive} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3">
            <span className="text-lg">☁️</span> OneDrive
          </button>
        </div>
      )}
    </div>
  );
}
