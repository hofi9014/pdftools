import { t, isRtlLocale, type Locale } from '@/lib/i18n';
import type { BatchFailure } from '@/lib/batch';

// Lists the files a batch tool could not process, with each file's own reason. When some files
// succeeded it is a warning next to the result; when every file of a multi-file batch failed it
// is the error itself (a single failed file shows its own message through the page's error box).
export default function BatchFailures({ failed, total, locale }: { failed: BatchFailure[]; total: number; locale: Locale }) {
  if (failed.length === 0) return null;
  const allFailed = failed.length >= total;
  if (allFailed && total <= 1) return null;
  const list = (
    <ul className={`text-sm list-disc space-y-1 mt-1 ${isRtlLocale(locale) ? 'pr-5' : 'pl-5'}`}>
      {failed.map((f, i) => <li key={i}><span className="font-medium">{f.name}</span>: {f.message}</li>)}
    </ul>
  );
  if (allFailed) {
    return (
      <div data-testid="batch-all-failed" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">
        <p className="font-medium">⚠️ {t('batch.all_failed', locale)}</p>
        {list}
      </div>
    );
  }
  return (
    <div data-testid="batch-failed" className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 rounded-xl p-4 mb-6">
      <p className="font-medium">⚠️ {t('batch.partial_failed', locale, { failed: String(failed.length), total: String(total) })}</p>
      {list}
    </div>
  );
}
