import { useEffect, useState } from "react";

export type ArticleSummary = {
  slug: string;
  title: string;
  metaDescription: string;
  category: string;
  tags: string[];
  heroUrl: string | null;
  heroAlt: string | null;
  author: string | null;
  publishedAt: string | null;
  readingTime: number | null;
};

export type ArticleFull = ArticleSummary & {
  body: string;
  lastModifiedAt: string | null;
  wordCount: number | null;
  ogImage?: string | null;
};

export function useArticles(limit = 60) {
  const [data, setData] = useState<ArticleSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/articles?limit=${limit}`)
      .then(r => r.json())
      .then(j => { if (!cancelled) { setData(j.articles || []); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [limit]);
  return { data, loading, error };
}

export function useArticle(slug: string | undefined) {
  const [data, setData] = useState<ArticleFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/articles/${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(j => { if (!cancelled) { setData(j); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [slug]);
  return { data, loading, error };
}

export function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
