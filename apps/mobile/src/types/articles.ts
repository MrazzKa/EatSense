export interface ArticleSummary {
  id: string;
  slug: string;
  locale: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  readingMinutes: number | null;
  tags: string[];
  heroImageUrl: string | null;
  coverUrl: string | null; // Legacy field (kept for backward compatibility)
  coverAlt: string | null;
  sourceName: string | null;
  publishedAt: string | null;
  viewCount: number;
}

export interface ArticleDetail extends ArticleSummary {
  contentHtml: string | null;
  bodyMarkdown: string;
  contentMd: string | null; // Legacy field (kept for backward compatibility)
  sourceUrl: string | null;
}

export interface ArticleFeed {
  articles: ArticleSummary[];
  page: number;
  pageSize: number;
  total: number;
}
