export type WebSource = {
  title: string;
  url: string;
  snippet: string;
  publisher: string;
};

export type WebCandidate = {
  label: string;
  title: string;
  url: string;
};

export type WebSearchResult = {
  answer: string;
  sources: WebSource[];
  candidates?: WebCandidate[];
};

type WikipediaSearchResponse = {
  query?: {
    search?: Array<{ title: string; snippet: string; pageid: number }>;
  };
};

type WikipediaSummary = {
  title?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
};

type GdeltResponse = {
  articles?: Array<{
    title?: string;
    url?: string;
    domain?: string;
    seendate?: string;
  }>;
};

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const WIKIPEDIA_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const GDELT_API = 'https://api.gdeltproject.org/api/v2/doc/doc';

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Search request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function searchWeb(query: string, selectedTitle?: string): Promise<WebSearchResult> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return { answer: 'Type a question or name to search.', sources: [] };

  const wantsCurrentInfo = /\b(latest|today|current|recent|news|event|happened|happening|update|now|this week|this month|president|election|match|score|concert|death|movie|album)\b/i.test(cleanQuery);
  if (!selectedTitle && wantsCurrentInfo) {
    try {
      const news = await fetchJson<GdeltResponse>(
        `${GDELT_API}?query=${encodeURIComponent(cleanQuery)}&mode=artlist&format=json&maxrecords=5&sort=HybridRel`,
      );
      const articles = (news.articles || []).filter((article) => article.title && article.url);
      if (articles.length) {
        const sources = articles.map((article) => ({
          title: article.title || 'Untitled result',
          url: article.url || '',
          snippet: article.seendate ? `Published ${article.seendate.slice(0, 8)}` : 'Current web result',
          publisher: article.domain || 'News source',
        }));
        return {
          answer: `I found current coverage for “${cleanQuery}”. These are the reported results I can verify right now; open a source to read the full article.`,
          sources,
        };
      }
    } catch {
      // Fall through to the public encyclopedia search if the news endpoint is unavailable.
    }
  }

  const search = await fetchJson<WikipediaSearchResponse>(
    `${WIKIPEDIA_API}?action=query&list=search&srsearch=${encodeURIComponent(selectedTitle || cleanQuery)}&srlimit=5&srprop=snippet&format=json&origin=*`,
  );
  const pages = search.query?.search || [];
  if (!pages.length) {
    return {
      answer: `I couldn’t find a reliable result for “${cleanQuery}”. I don’t want to invent facts. Try a fuller name or a more specific search.`,
      sources: [],
    };
  }

  const candidates = pages.slice(0, 4).map((page) => ({
    label: page.title,
    title: page.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`,
  }));
  const likelyPersonQuery = /^[a-z][a-z .'-]+$/i.test(cleanQuery) && cleanQuery.split(/\s+/).length >= 2 && cleanQuery.split(/\s+/).length <= 5;
  if (!selectedTitle && likelyPersonQuery && pages.length > 1) {
    return {
      answer: `I found several possible matches for “${cleanQuery}”. Choose one so I can use the right source instead of guessing.`,
      sources: candidates.slice(0, 3).map((candidate, index) => ({
        title: candidate.title,
        url: candidate.url,
        snippet: stripHtml(pages[index].snippet),
        publisher: 'Wikipedia',
      })),
      candidates: candidates.slice(0, 3),
    };
  }

  const title = selectedTitle || pages[0].title;
  const summary = await fetchJson<WikipediaSummary>(`${WIKIPEDIA_SUMMARY}${encodeURIComponent(title.replaceAll(' ', '_'))}`);
  const source: WebSource = {
    title: summary.title || title,
    url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`,
    snippet: summary.extract || stripHtml(pages[0].snippet),
    publisher: 'Wikipedia',
  };
  return {
    answer: source.snippet
      ? `${source.title}\n\n${source.snippet}\n\nSource: ${source.publisher}`
      : `I found ${source.title}, but the source did not provide enough detail to answer confidently.`,
    sources: [source],
  };
}