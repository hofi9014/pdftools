const MAX_TEXT_LENGTH = 12000;
const MAX_SUMMARY_TRANSLATE_LENGTH = 120000;

// FINDING (silent truncation + notice-overflow, 2026-09-21) — two bugs here, found together.
// (1) askAI already appended a notice into the text sent to the model when truncating (so a
// chat answer can account for missing content), but summarizeText/translateText silently
// sliced with no notice at all: for a document longer than the limit, the returned
// "summary"/"translation" silently covered only the first portion with nothing telling the
// model or the user that content was dropped.
// (2) A more serious, pre-existing bug in askAI's OWN truncation, exposed while fixing (1):
// the old code sliced to exactly MAX_TEXT_LENGTH chars and then APPENDED the notice on top,
// pushing the actual request length past the server's own strict limit (app/api/ai/route.ts:
// `text.length > maxTextLength` -> 400) by the notice's own length (53 chars, measured). Every
// chat message that actually NEEDED truncation (i.e. every long-document AI chat) therefore
// hit a hard 400 rejection instead of getting a working, truncated response — the one case the
// truncation exists to handle. Fixed by reserving room for the notice inside the length
// budget (slice to `maxLen - notice.length`, not `maxLen`), so the final text is always
// exactly at or under the server's limit; reused for summarizeText/translateText too, so they
// get the same truncation notice as askAI without the same overflow.
function truncateWithNotice(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const notice = `\n\n[... tekst przyciety, pelna wersja ma ${text.length} znakow]`;
  return text.slice(0, maxLen - notice.length) + notice;
}

export async function askAI(text: string, question: string): Promise<string> {
  const truncated = truncateWithNotice(text, MAX_TEXT_LENGTH);

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'chat', text: truncated, question }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Usługa AI tymczasowo niedostępna');
  }
  const data = await res.json();
  return data.content;
}

export async function summarizeText(text: string): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'summary', text: truncateWithNotice(text, MAX_SUMMARY_TRANSLATE_LENGTH) }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Usługa AI tymczasowo niedostępna');
  }
  const data = await res.json();
  return data.content;
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'translate', text: truncateWithNotice(text, MAX_SUMMARY_TRANSLATE_LENGTH), language: targetLang }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Usługa AI tymczasowo niedostępna');
  }
  const data = await res.json();
  return data.content;
}


