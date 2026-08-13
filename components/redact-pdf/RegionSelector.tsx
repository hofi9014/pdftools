'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPageCount } from '@/lib/client-pdf';
import type { RedactRegion } from '@/lib/pdf-raster';
import RedactCanvas from './RedactCanvas';

interface RegionSelectorProps {
  file: File;
  regions: RedactRegion[];
  onRegionsChange: (regions: RedactRegion[]) => void;
}

export default function RegionSelector({ file, regions, onRegionsChange }: RegionSelectorProps) {
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getPageCount(file).then((n) => {
      if (!cancelled) {
        setPageCount(n);
        setCurrentPage(0);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [file]);

  const pageRegions = useMemo(
    () => regions.filter((r) => r.page === currentPage),
    [regions, currentPage],
  );

  const handlePageRegionsChange = useCallback((next: RedactRegion[]) => {
    onRegionsChange([...regions.filter((r) => r.page !== currentPage), ...next]);
  }, [regions, currentPage, onRegionsChange]);

  if (pageCount === 0) {
    return <div className="text-gray-500 dark:text-gray-400 text-sm">Wczytywanie podglądu…</div>;
  }

  const totalRegions = regions.length;
  const pageRegionsCount = pageRegions.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="font-bold text-gray-800 dark:text-gray-200">
          Zaznacz regiony do redakcji
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            ({totalRegions} łącznie · {pageRegionsCount} na tej stronie)
          </span>
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
          >← Poprzednia</button>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentPage(i)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition ${
                i === currentPage
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300'
              }`}
            >{i + 1}</button>
          ))}
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage === pageCount - 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
          >Następna →</button>
        </div>
      </div>

      <div className="flex justify-center">
        <RedactCanvas
          file={file}
          pageIndex={currentPage}
          pageRegions={pageRegions}
          onPageRegionsChange={handlePageRegionsChange}
        />
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        Narysuj prostokąt myszą, aby zaznaczyć fragment do zaczernienia. Zaznaczony region możesz przesuwać lub usunąć klawiszem Delete.
      </p>
    </div>
  );
}
