import { useMemo } from "react";
import { Article } from "../data";
import { scoreArticle, sentimentLabelFa } from "../sentiment";
import { toFa } from "./mobile/utils/fa";

type Props = {
  article: Article;
  size?: "sm" | "md";
  showScore?: boolean;
};

export function SentimentBadge({ article, size = "sm", showScore = false }: Props) {
  const s = useMemo(() => scoreArticle(article), [article]);
  if (s.confidence < 0.15 && s.label === "neutral") return null;

  const dotCls =
    s.label === "positive"
      ? "bg-emerald-500"
      : s.label === "negative"
        ? "bg-rose-500"
        : "bg-muted-foreground/50";

  const textCls =
    s.label === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : s.label === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";

  const textSize = size === "md" ? "text-xs" : "text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ${textSize} ${textCls}`}
      title={`لحن خبر: ${sentimentLabelFa(s.label)} · امتیاز: ${toFa(s.score.toFixed(2))} (${toFa(s.positives)}+ / ${toFa(s.negatives)}-)`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
      <span>لحن {sentimentLabelFa(s.label)}</span>
      {showScore && <span className="opacity-75 tabular-nums">{toFa(s.score.toFixed(2))}</span>}
    </span>
  );
}

export function SentimentSummary({ articles }: { articles: Article[] }) {
  const agg = useMemo(() => {
    let pos = 0, neg = 0, neu = 0, avg = 0;
    for (const a of articles) {
      const s = scoreArticle(a);
      if (s.label === "positive") pos++;
      else if (s.label === "negative") neg++;
      else neu++;
      avg += s.score;
    }
    return { pos, neg, neu, avg: articles.length ? avg / articles.length : 0, total: articles.length };
  }, [articles]);

  if (agg.total === 0) return null;
  const pct = (n: number) => Math.round((n / agg.total) * 100);
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">تحلیل لحن پوشش</h4>
        <span className="text-xs text-muted-foreground tabular-nums">{toFa(agg.total)} مقاله</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-muted mb-3">
        <div className="bg-emerald-500 transition-transform" style={{ width: `${pct(agg.pos)}%` }} title={`مثبت ${toFa(pct(agg.pos))}٪`} />
        <div className="bg-muted-foreground/40 transition-transform" style={{ width: `${pct(agg.neu)}%` }} title={`خنثی ${toFa(pct(agg.neu))}٪`} />
        <div className="bg-rose-500 transition-transform" style={{ width: `${pct(agg.neg)}%` }} title={`منفی ${toFa(pct(agg.neg))}٪`} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs tabular-nums">
        <div>
          <div className="text-emerald-600 dark:text-emerald-400 font-semibold">{toFa(agg.pos)}</div>
          <div className="text-muted-foreground text-[11px]">مثبت · {toFa(pct(agg.pos))}٪</div>
        </div>
        <div>
          <div className="text-foreground/80 font-semibold">{toFa(agg.neu)}</div>
          <div className="text-muted-foreground text-[11px]">خنثی · {toFa(pct(agg.neu))}٪</div>
        </div>
        <div>
          <div className="text-rose-600 dark:text-rose-400 font-semibold">{toFa(agg.neg)}</div>
          <div className="text-muted-foreground text-[11px]">منفی · {toFa(pct(agg.neg))}٪</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground text-center tabular-nums">
        شاخص میانگین: <span className={`font-semibold ${agg.avg > 0.1 ? "text-emerald-600 dark:text-emerald-400" : agg.avg < -0.1 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>{toFa(agg.avg.toFixed(2))}</span>
      </div>
    </div>
  );
}
