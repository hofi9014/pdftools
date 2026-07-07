const MAX_TEXT_LENGTH = 12000;

export async function askAI(text: string, question: string, _apiKey?: string): Promise<string> {
  const truncated = text.length > MAX_TEXT_LENGTH
    ? text.slice(0, MAX_TEXT_LENGTH) + `\n\n[... tekst przyciety, pelna wersja ma ${text.length} znakow]`
    : text;

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

export async function summarizeText(text: string, _apiKey?: string): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'summary', text: text.slice(0, 120000) }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Usługa AI tymczasowo niedostępna');
  }
  const data = await res.json();
  return data.content;
}

export async function translateText(text: string, targetLang: string, _apiKey?: string): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'translate', text: text.slice(0, 120000), language: targetLang }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Usługa AI tymczasowo niedostępna');
  }
  const data = await res.json();
  return data.content;
}


