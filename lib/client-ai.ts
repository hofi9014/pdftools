const STORAGE_KEY = 'openrouter_api_key';
const MAX_TEXT_LENGTH = 12000;

export function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

export async function askAI(text: string, question: string, apiKey: string): Promise<string> {
  const truncated = text.length > MAX_TEXT_LENGTH
    ? text.slice(0, MAX_TEXT_LENGTH) + `\n\n[... tekst przyciety, pelna wersja ma ${text.length} znakow]`
    : text;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct',
      messages: [
        { role: 'system', content: 'Odpowiadasz na pytania na podstawie dolaczonego dokumentu. Jesli odpowiedz znajduje sie w dokumencie, zacytuj odpowiedni fragment. Jesli nie ma jej w dokumencie, napisz ze dokument nie zawiera tej informacji.' },
        { role: 'user', content: 'Dokument:\n' + truncated + '\n\nPytanie: ' + question },
      ],
      max_tokens: 2000,
    }),
  });

  if (!res.ok) throw new Error('OpenRouter: ' + (await res.text() || res.statusText));
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'Brak odpowiedzi.';
}

export async function summarizeText(text: string, apiKey: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct',
      messages: [
        { role: 'system', content: 'Stworz zwięzłe streszczenie poniższego tekstu w języku polskim. Wypisz najważniejsze punkty w formie wypunktowania. Odpowiedz tylko po polsku.' },
        { role: 'user', content: text.slice(0, 120000) },
      ],
      max_tokens: 2048,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Blad AI: ${res.status} ${errBody}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || 'Brak odpowiedzi';
}

export async function translateText(text: string, targetLang: string, apiKey: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct',
      messages: [
        { role: 'system', content: `Przetłumacz poniższy tekst na język ${targetLang}. Zachowaj oryginalne formatowanie, akapity i strukturę. Zwróć tylko przetłumaczony tekst, bez komentarzy.` },
        { role: 'user', content: text.slice(0, 120000) },
      ],
      max_tokens: 32000,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Błąd AI: ${res.status} ${errBody}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || 'Brak odpowiedzi';
}

export function keywordSearch(text: string, question: string): string {
  const cleaned = text.trim();
  if (!cleaned) return 'Dokument nie zawiera tekstu do przeszukania.';
  const words = question.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const paragraphs = cleaned.split('\n---\n').filter(p => p.trim());
  const scored = paragraphs.map(p => ({
    score: words.reduce((s, w) => {
      const regex = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = p.match(regex);
      return s + (matches ? matches.length : 0);
    }, 0),
    text: p.trim(),
  }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored.filter(s => s.score > 0).slice(0, 3);
  if (best.length > 0) return best.map(s => s.text.substring(0, 2000)).join('\n\n---\n\n');
  const preview = paragraphs.slice(0, 2).map(p => p.trim().substring(0, 1000)).join('\n\n---\n\n');
  return 'Nie znaleziono fragmentow zawierajacych: "' + words.join('", "') + '".' + (preview ? '\n\nPoczatek dokumentu:\n' + preview : '');
}

export function getPreview(text: string): string {
  const sentences = text.match(/[^.!?\n]+[.!?]/g) || [text.slice(0, 200)];
  return sentences.slice(0, 5).join(' ');
}
