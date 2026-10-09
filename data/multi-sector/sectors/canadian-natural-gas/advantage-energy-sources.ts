
export type AdvantageSourceKind =
  | "financial-report"
  | "company-results"
  | "company-announcement";

export interface AdvantageSource {
  sourceId: string;
  title: string;
  url: string;
  publishedAt: string;
  kind: AdvantageSourceKind;
  coversActualsThrough?: string;
  guidanceAllowed: boolean;
}

export const advantageSources: readonly AdvantageSource[] = [
  {
    sourceId: "aav-q2-2026",
    title: "Advantage Announces Second Quarter 2026 Results",
    url: "https://www.newswire.ca/news-releases/advantage-announces-second-quarter-2026-results-825111159.html",
    publishedAt: "2026-07-30",
    kind: "company-results",
    coversActualsThrough: "2026-06-30",
    guidanceAllowed: true,
  },
  {
    sourceId: "aav-wembley-announcement-2026",
    title: "Advantage Announces Wembley Disposition and Accelerated Return of Capital",
    url: "https://www.advantageog.com/investors/newsreleases",
    publishedAt: "2026-08-26",
    kind: "company-announcement",
    guidanceAllowed: true,
  },
  {
    sourceId: "aav-wembley-closing-2026",
    title: "Advantage Announces Closing of Wembley Disposition",
    url: "https://www.advantageog.com/investors/newsreleases/article?id=122774",
    publishedAt: "2026-09-11",
    kind: "company-announcement",
    guidanceAllowed: false,
  },
];

export function findAdvantageSource(
  sourceId: string,
  registry: readonly AdvantageSource[] = advantageSources
): AdvantageSource | undefined {
  return registry.find((source) => source.sourceId === sourceId);
}
