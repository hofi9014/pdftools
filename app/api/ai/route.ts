import { NextRequest, NextResponse } from 'next/server';
import { checkAiRateLimit } from '@/lib/ai-rate-limit';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'openai/gpt-4o-mini';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: 'Usługa AI tymczasowo niedostępna' },
      { status: 503 }
    );
  }

  const clientIp = getClientIp(request);
  const rateCheck = checkAiRateLimit(clientIp);
  if (!rateCheck.allowed) {
    const resetSeconds = Math.ceil((rateCheck.resetAt - Date.now()) / 1000);
    const resetHours = Math.ceil(resetSeconds / 3600);
    return NextResponse.json(
      { error: `Przekroczono dzienny limit 15 zapytań AI. Spróbuj ponownie za ${resetHours > 1 ? `${resetHours} godziny` : 'godzinę'}.` },
      {
        status: 429,
        headers: {
          'Retry-After': String(resetSeconds),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const { text, task, question, language } = await request.json();

  let systemPrompt: string;
  let userPrompt: string;
  let maxTokens: number;
  let temperature: number;

  switch (task) {
    case 'chat':
      systemPrompt = 'Odpowiadasz na pytania na podstawie dolaczonego dokumentu. Jesli odpowiedz znajduje sie w dokumencie, zacytuj odpowiedni fragment. Jesli nie ma jej w dokumencie, napisz ze dokument nie zawiera tej informacji.';
      userPrompt = 'Dokument:\n' + text + '\n\nPytanie: ' + question;
      maxTokens = 2000;
      temperature = 0.7;
      break;
    case 'summary':
      systemPrompt = 'Stworz zwięzłe streszczenie poniższego tekstu w języku polskim. Wypisz najważniejsze punkty w formie wypunktowania. Odpowiedz tylko po polsku.';
      userPrompt = text;
      maxTokens = 2048;
      temperature = 0.3;
      break;
    case 'translate':
      systemPrompt = `Przetłumacz poniższy tekst na język ${language}. Zachowaj oryginalne formatowanie, akapity i strukturę. Zwróć tylko przetłumaczony tekst, bez komentarzy.`;
      userPrompt = text;
      maxTokens = 32000;
      temperature = 0.2;
      break;
    default:
      return NextResponse.json({ error: 'Nieznany typ zadania' }, { status: 400 });
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    return NextResponse.json(
      { error: `Błąd AI: ${res.status}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || 'Brak odpowiedzi';
  return NextResponse.json(
    { content },
    {
      headers: {
        'X-RateLimit-Remaining': String(rateCheck.remaining),
        'X-RateLimit-Reset': String(rateCheck.resetAt),
      },
    }
  );
}
