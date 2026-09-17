import { NextRequest, NextResponse } from 'next/server';
import { checkAiRateLimit, refundAiRateLimit } from '@/lib/ai-rate-limit';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'openai/gpt-4o-mini';

// The client (lib/client-ai.ts) already truncates text before sending — 12000 chars for
// 'chat', 120000 for 'summary'/'translate' — but that only constrains requests made through
// the app's own UI. A request sent directly to this endpoint bypasses the client entirely, so
// these same limits must be enforced here too, or an arbitrarily large `text`/`question`/
// `language` gets forwarded straight into the OpenRouter request body (unbounded OpenRouter
// input-token cost the app pays for, regardless of the response-side max_tokens cap).
const MAX_TEXT_LENGTH_CHAT = 12000;
const MAX_TEXT_LENGTH_BULK = 120000;
const MAX_QUESTION_LENGTH = 2000;
const MAX_LANGUAGE_LENGTH = 100;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
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
  const rateCheck = await checkAiRateLimit(clientIp);
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

  let body: { text: string; task: string; question: string; language: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Nieprawidłowe żądanie (błędny JSON).' }, { status: 400 });
  }
  const { text, task, question, language } = body;

  if (typeof text !== 'string' || text.length === 0) {
    return NextResponse.json({ error: 'Pole text jest wymagane.' }, { status: 400 });
  }
  const maxTextLength = task === 'chat' ? MAX_TEXT_LENGTH_CHAT : MAX_TEXT_LENGTH_BULK;
  if (text.length > maxTextLength) {
    return NextResponse.json(
      { error: `Tekst jest za długi. Maksymalna długość: ${maxTextLength} znaków.` },
      { status: 400 }
    );
  }
  if (task === 'chat' && typeof question === 'string' && question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `Pytanie jest za długie. Maksymalna długość: ${MAX_QUESTION_LENGTH} znaków.` },
      { status: 400 }
    );
  }
  if (task === 'translate' && typeof language === 'string' && language.length > MAX_LANGUAGE_LENGTH) {
    return NextResponse.json(
      { error: `Nazwa języka jest za długa. Maksymalna długość: ${MAX_LANGUAGE_LENGTH} znaków.` },
      { status: 400 }
    );
  }

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

  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
  } catch (e) {
    // QA-001: a provider-side failure (network error reaching OpenRouter) must not
    // cost the user their daily AI quota — give the token back.
    await refundAiRateLimit(clientIp);
    console.error('[ai] OpenRouter request failed:', e);
    return NextResponse.json(
      { error: 'Usługa AI tymczasowo niedostępna. Spróbuj ponownie.' },
      { status: 502 }
    );
  }

  if (!res.ok) {
    // QA-001: only refund on a genuine provider-infrastructure failure (5xx). A 4xx
    // (400/413/422/...) can be triggered by the content of the user's own request (e.g.
    // text exceeding the model's context window) — refunding those would let an attacker
    // retry forever for free, defeating the rate limit entirely.
    if (res.status >= 500) {
      await refundAiRateLimit(clientIp);
    }
    const errBody = await res.text();
    console.error(`[ai] OpenRouter error ${res.status}: ${errBody}`);
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
