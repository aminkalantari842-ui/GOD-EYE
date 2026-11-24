import {
  Star, Bookmark, Share2, Link2, Printer, X, ExternalLink,
  Highlighter, Plus, Quote, Clock, Languages, Loader2, Check,
  BookOpen, Layers,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Article } from "../data";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { TagEditor } from "./TagEditor";
import { SentimentBadge } from "./SentimentBadge";
import {
  loadNotes, newNote, appendHighlight, getLastNoteId,
  setLastNoteId, quotesForArticle, type Note,
} from "../notes";
import type { TopicQuery } from "../timeline";
import { api } from "../api";
import { studioUserId } from "./mobile/studio/studio";
import {
  extractFullContent, getFullContent, getArticleFa, setArticleFa,
} from "../translationCache";
import {
  SPRING_POP,
  SPRING_SILK,
  TRANSITION_EDITORIAL,
  clampReadingProgress,
  detectTextDirection,
} from "../motion/editorialMotion";

type Props = {
  article: Article | null;
  onClose: () => void;
  toggleStar: (id: string) => void;
  toggleSave?: (id: string) => void;
  isSaved?: boolean;
  onTagsChange?: (id: string, tags: string[]) => void;
  related?: { article: Article; score: number }[];
  duplicates?: { article: Article; score: number }[];
  onSelectRelated?: (id: string) => void;
  onOpenTimeline?: (topic: TopicQuery) => void;
  onOpenReadingMode?: () => void;
};

export function ArticleView({
  article, onClose, toggleStar, toggleSave, isSaved, onTagsChange,
  related, duplicates, onSelectRelated, onOpenTimeline, onOpenReadingMode,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hl, setHl] = useState<{ x: number; y: number; quote: string } | null>(null);
  const [picker, setPicker] = useState<{ quote: string } | null>(null);
  const [quoteTick, setQuoteTick] = useState(0);
  const quotes = useMemo(() => article ? quotesForArticle(article.id) : [], [article?.id, quoteTick]);

  // On-demand full-article translation to Persian (title + body), toggleable.
  const [trans, setTrans] = useState<{ title: string; content: string } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [transFromCache, setTransFromCache] = useState(false);
  const [heroHidden, setHeroHidden] = useState(false);

  useEffect(() => {
    setTrans(null);
    setTranslating(false);
    setHeroHidden(false);
    setShowOriginal(false);
    setTransFromCache(false);
    setCopiedLink(false);
  }, [article?.id]);

  // Full-text extraction when stored RSS content is short
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [fullError, setFullError] = useState(false);
  const baseContent = fullContent ?? (article?.content || "");

  const loadFull = async () => {
    if (!article?.link || loadingFull) return;
    setLoadingFull(true);
    setFullError(false);
    const content = await extractFullContent(article.link);
    if (content && content.length > (article.content?.length || 0)) {
      setFullContent(content);
      setTrans(null);
    } else if (!article.content?.trim()) {
      setFullError(true);
    }
    setLoadingFull(false);
  };

  useEffect(() => {
    setFullContent(null);
    setLoadingFull(false);
    setFullError(false);
    if (!article?.link) return;
    const cached = getFullContent(article.link);
    if (cached && cached.length > (article.content?.length || 0)) {
      setFullContent(cached);
      return;
    }
    const short = (article.content?.trim().length || 0) < 600;
    if (short) {
      let cancelled = false;
      (async () => {
        setLoadingFull(true);
        const content = await extractFullContent(article.link!);
        if (cancelled) return;
        if (content && content.length > (article.content?.length || 0)) setFullContent(content);
        else if (!article.content?.trim()) setFullError(true);
        setLoadingFull(false);
      })();
      return () => { cancelled = true; };
    }
  }, [article?.id]);

  const translateArticle = async () => {
    if (!article || translating) return;
    if (trans) { setShowOriginal(v => !v); return; }
    const cached = getArticleFa(article.id);
    if (cached && cached.content) {
      setTrans(cached);
      setTransFromCache(true);
      setShowOriginal(false);
      return;
    }
    setTranslating(true);
    try {
      const paras = baseContent.split("\n\n");
      const texts = [article.title, ...paras];
      const out: string[] = [];
      for (let i = 0; i < texts.length; i += 20) {
        const chunk = texts.slice(i, i + 20);
        const r = await api.aiTranslateBatch({ texts: chunk, to: "fa" }, studioUserId());
        chunk.forEach((t, j) => out.push(r[j]?.trim() || t));
      }
      const value = { title: out[0] || article.title, content: out.slice(1).join("\n\n") };
      setArticleFa(article.id, value);
      setTrans(value);
      setTransFromCache(false);
      setShowOriginal(false);
    } catch (e) {
      console.log("article translation failed:", e);
    } finally {
      setTranslating(false);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      setProgress(clampReadingProgress(el.scrollTop, el.scrollHeight, el.clientHeight));
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [article?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setHl(null);
    setPicker(null);
    setProgress(0);
  }, [article?.id]);

  useEffect(() => {
    const onUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) { setHl(null); return; }
      const text = sel.toString().trim();
      if (text.length < 4) { setHl(null); return; }
      const root = contentRef.current;
      if (!root) return;
      const anchor = sel.anchorNode;
      const node = anchor?.nodeType === 1 ? (anchor as Node) : anchor?.parentNode;
      if (!node || !root.contains(node)) { setHl(null); return; }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const sr = scrollRef.current?.getBoundingClientRect();
      if (!sr) return;
      setHl({ x: r.left + r.width / 2 - sr.left, y: r.top - sr.top - 10, quote: text });
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
    };
  }, [article?.id]);

  const quickHighlight = () => {
    if (!hl || !article) return;
    const last = getLastNoteId();
    const all = loadNotes();
    const target = (last && all.find(n => n.id === last)) || all[0];
    if (target) {
      appendHighlight(target.id, hl.quote, article.title, article.id);
      setLastNoteId(target.id);
      setHl(null);
      setQuoteTick(t => t + 1);
      toast.success("نقل‌قول در یادداشت ذخیره شد");
      window.getSelection()?.removeAllRanges();
    } else {
      setPicker({ quote: hl.quote });
      setHl(null);
    }
  };

  const pickHighlight = (noteId: string) => {
    if (!picker || !article) return;
    appendHighlight(noteId, picker.quote, article.title, article.id);
    setLastNoteId(noteId);
    setPicker(null);
    setQuoteTick(t => t + 1);
    toast.success("نقل‌قول ذخیره شد");
    window.getSelection()?.removeAllRanges();
  };

  const createAndAttach = () => {
    if (!picker || !article) return;
    const n = newNote(`نقل‌قول‌های «${article.title.slice(0, 40)}»`);
    appendHighlight(n.id, picker.quote, article.title, article.id);
    setLastNoteId(n.id);
    setPicker(null);
    setQuoteTick(t => t + 1);
    toast.success("یادداشت تازه ساخته شد");
    window.getSelection()?.removeAllRanges();
  };

  const copyLink = () => {
    const url = article?.link || window.location.href;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    toast.success("پیوند مقاله کپی شد");
    setTimeout(() => setCopiedLink(false), 1600);
  };

  const shareArticle = () => {
    if (!article) return;
    const url = article.link || window.location.href;
    if (navigator.share) {
      navigator.share({ title: article.title, text: article.preview, url }).catch(() => {});
    } else {
      copyLink();
    }
  };

  if (!article) {
    return (
      <aside className="flex-1 min-w-0 bg-[var(--background-subtle)] border-r border-[var(--border-subtle)] flex flex-col items-center justify-center p-10 text-center select-none">
        <div className="size-12 rounded-[var(--radius-lg)] bg-[var(--card)] border border-[var(--border-subtle)] grid place-items-center mb-3 shadow-[var(--shadow-xs)]">
          <BookOpen className="w-5 h-5 text-[var(--foreground-subtle)]" />
        </div>
        <div className="font-display text-lg font-semibold text-[var(--foreground)] mb-1">
          میز مطالعه آماده است
        </div>
        <p className="text-xs text-[var(--foreground-subtle)] max-w-xs leading-relaxed">
          یکی از مقالات فهرست را انتخاب کنید یا با کلیدهای <kbd className="font-mono px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border-subtle)]">J</kbd> و <kbd className="font-mono px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border-subtle)]">K</kbd> پیمایش کنید.
        </p>
      </aside>
    );
  }

  const displayTitle = trans && !showOriginal ? trans.title : article.title;
  const paragraphs = (trans && !showOriginal ? trans.content : baseContent)
    .split('\n\n')
    .map(s => s.trim())
    .filter(Boolean);
  const titleDir = detectTextDirection(displayTitle);
  const bodyDir = detectTextDirection(paragraphs[0] || displayTitle);

  return (
    <aside
      aria-label="مطالعه مقاله"
      className="w-full md:w-[460px] xl:w-[560px] shrink-0 h-full bg-[var(--card)] border-r border-[var(--border-subtle)] flex flex-col relative overflow-hidden"
    >
      {/* Compositor GPU Reading Progress Ribbon */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent z-30 pointer-events-none">
        <motion.div
          className="h-full w-full bg-[var(--brand-500)] origin-right"
          style={{ scaleX: progress }}
        />
      </div>

      {/* Curatorial Action Bar */}
      <div className="glass-card shrink-0 border-b border-[var(--border-subtle)] px-4 py-2.5 flex items-center gap-1 z-20">
        <motion.button
          type="button"
          whileTap={{ scale: 0.8 }}
          transition={SPRING_POP}
          onClick={() => toggleStar(article.id)}
          aria-label={article.starred ? "حذف نشان" : "نشان کردن مقاله"}
          aria-pressed={article.starred}
          title={article.starred ? "حذف نشان (S)" : "نشان کردن (S)"}
          className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        >
          <Star className={`w-4 h-4 ${article.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.8 }}
          transition={SPRING_POP}
          onClick={() => toggleSave?.(article.id)}
          aria-label={isSaved ? "حذف از ذخیره‌شده‌ها" : "ذخیره برای مطالعه بعدی"}
          aria-pressed={!!isSaved}
          title="ذخیره برای بعد"
          className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[var(--brand-500)] text-[var(--brand-500)]' : ''}`} />
        </motion.button>

        <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />

        {onOpenReadingMode && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onOpenReadingMode}
            aria-label="حالت تمرکز مطالعه"
            title="حالت تمرکز مطالعه (F)"
            className="px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-subtle)] hover:bg-[var(--background-muted)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--foreground)] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--brand-600)] dark:text-[var(--brand-400)]" />
            <span>حالت مطالعه</span>
          </motion.button>
        )}

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={translateArticle}
          disabled={translating}
          aria-label="ترجمه متن مقاله به فارسی"
          className={`p-2 rounded-[var(--radius-md)] disabled:opacity-50 transition-colors cursor-pointer ${
            trans && !showOriginal
              ? 'bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)]'
              : 'hover:bg-[var(--background-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
          }`}
          title={trans ? (showOriginal ? 'نمایش ترجمهٔ فارسی' : 'نمایش متن اصلی') : 'ترجمهٔ کامل خبر به فارسی'}
        >
          {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={copyLink}
          aria-label="کپی پیوند مقاله"
          className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          title="کپی پیوند"
        >
          {copiedLink ? <Check className="w-4 h-4 text-[var(--brand-500)]" /> : <Link2 className="w-4 h-4" />}
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={shareArticle}
          aria-label="اشتراک‌گذاری مقاله"
          className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          title="اشتراک‌گذاری"
        >
          <Share2 className="w-4 h-4" />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => window.print()}
          aria-label="چاپ مقاله"
          className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          title="چاپ"
        >
          <Printer className="w-4 h-4" />
        </motion.button>

        {article.link && (
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="مشاهده مقاله در منبع اصلی"
            className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            title="مشاهده در منبع اصلی (O)"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <div className="flex-1" />

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          aria-label="بستن پنل مقاله"
          title="بستن (Esc)"
          className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Scrollable Monograph Canvas */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <AnimatePresence>
          {hl && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={SPRING_SILK}
              onClick={quickHighlight}
              style={{ left: Math.max(72, Math.min(hl.x, 380)), top: Math.max(12, hl.y) }}
              className="absolute z-30 -translate-x-1/2 -translate-y-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs px-3 py-1.5 rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Highlighter className="w-3.5 h-3.5" /> ذخیره در یادداشت
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {picker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={() => setPicker(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={SPRING_SILK}
                onClick={(e) => e.stopPropagation()}
                className="w-80 max-h-[70%] bg-[var(--popover)] text-[var(--popover-foreground)] rounded-[var(--radius-xl)] shadow-[var(--shadow-2xl)] flex flex-col overflow-hidden border border-[var(--border)]"
              >
                <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] text-xs font-semibold">
                  افزودن نقل‌قول به یادداشت
                </div>
                <div className="p-3 text-xs text-[var(--foreground-muted)] border-b border-[var(--border-subtle)] line-clamp-3 italic">
                  «{picker.quote}»
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadNotes().sort((a: Note, b: Note) => b.updatedAt - a.updatedAt).map((n: Note) => (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => pickHighlight(n.id)}
                      className="w-full text-right px-4 py-2.5 hover:bg-[var(--background-subtle)] border-b border-[var(--border-subtle)] text-xs truncate cursor-pointer"
                    >
                      {n.title || "بدون عنوان"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={createAndAttach}
                  className="px-4 py-2.5 bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> ساخت یادداشت جدید
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={article.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={TRANSITION_EDITORIAL}
            className="max-w-[66ch] mx-auto px-6 sm:px-8 py-7"
          >
            {/* Unboxed Curatorial Byline */}
            <div className="flex items-center gap-2 text-xs text-[var(--foreground-subtle)] mb-3 flex-wrap tabular-nums">
              {onOpenTimeline ? (
                <button
                  type="button"
                  onClick={() => onOpenTimeline({ kind: "source", source: article.source })}
                  className="font-semibold text-[var(--brand-600)] dark:text-[var(--brand-400)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  title="مشاهده خط زمانی این منبع"
                >
                  <span>{article.source}</span>
                  <Clock className="w-3 h-3" />
                </button>
              ) : (
                <span className="font-semibold text-[var(--foreground-muted)]">{article.source}</span>
              )}
              {article.author && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{article.author}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{article.date}</span>
              {article.readTime && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{article.readTime} مطالعه</span>
                </>
              )}
            </div>

            {/* Expressive Display Headline */}
            <h1
              dir={titleDir}
              className={`font-display text-[23px] xl:text-[26px] font-bold text-[var(--foreground)] leading-[1.48] mb-4 text-balance ${
                titleDir === "ltr" ? "text-left" : "text-right"
              }`}
            >
              {displayTitle}
            </h1>

            {/* Secondary Attribution & Sentiment Line */}
            <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-[var(--border-subtle)] flex-wrap">
              <div className="flex items-center gap-2.5 text-xs text-[var(--foreground-subtle)]">
                <SentimentBadge article={article} size="sm" />
                {article.link && (
                  <>
                    <span aria-hidden="true">·</span>
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--foreground-muted)] hover:text-[var(--brand-600)] dark:hover:text-[var(--brand-400)] transition-colors"
                    >
                      <span>منبع اصلی</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
              <TagEditor
                tags={article.tags || []}
                onChange={(t) => onTagsChange?.(article.id, t)}
              />
            </div>

            {/* Framed Editorial Hero Photography (auto-collapses 1x1 tracking pixels) */}
            {article.image && !heroHidden && (
              <figure className="mb-6 group">
                <div className="rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border-subtle)] bg-[var(--background-muted)]">
                  <ImageWithFallback
                    src={article.image}
                    alt={article.title}
                    hideOnError
                    onInvalidImage={() => setHeroHidden(true)}
                    className="w-full max-h-72 object-cover editorial-img-zoom"
                  />
                </div>
              </figure>
            )}

            {/* Translation Status Strip */}
            {trans && (
              <div className="mb-4 text-xs text-[var(--brand-600)] dark:text-[var(--brand-400)] flex items-center gap-2 bg-[var(--accent)]/40 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                <Languages className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">
                  {showOriginal ? 'در حال نمایش متن اصلی' : 'ترجمه‌شده به فارسی'}
                  {!showOriginal && transFromCache ? ' · حافظه سریع' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setShowOriginal(v => !v)}
                  className="font-medium underline cursor-pointer"
                >
                  {showOriginal ? 'نمایش ترجمه' : 'متن اصلی'}
                </button>
              </div>
            )}

            {/* Body Prose */}
            <div
              ref={contentRef}
              dir={bodyDir}
              className={`text-[15.5px] text-[var(--foreground)] leading-[1.95] space-y-4 ${
                bodyDir === "ltr" ? "text-left" : "text-right"
              }`}
            >
              {paragraphs.map((p, i) => (
                <p key={i} className={i === 0 ? "text-[16px] font-medium text-[var(--foreground)]" : "text-[var(--foreground-muted)] dark:text-[var(--foreground)]/90"}>
                  {p}
                </p>
              ))}

              {loadingFull && (
                <div className="flex items-center gap-2 text-xs text-[var(--foreground-subtle)] pt-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--brand-500)]" />
                  <span>در حال استخراج متن کامل گزارش…</span>
                </div>
              )}

              {!loadingFull && fullError && article.link && (
                <div className="pt-2 text-xs text-[var(--foreground-subtle)]">
                  امکان استخراج خودکار متن کامل نبود.{" "}
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--brand-600)] dark:text-[var(--brand-400)] hover:underline font-medium"
                  >
                    مطالعهٔ کامل در منبع اصلی
                  </a>
                </div>
              )}

              {!loadingFull && !fullContent && !fullError && article.link && baseContent.trim().length >= 600 && (
                <button
                  type="button"
                  onClick={loadFull}
                  className="pt-2 text-xs font-medium text-[var(--brand-600)] dark:text-[var(--brand-400)] hover:underline cursor-pointer"
                >
                  بارگذاری نسخه کامل مقاله
                </button>
              )}
            </div>

            {/* Saved Quotes (All-Around Hairline Framing — Zero Thick Left/Right Clichés) */}
            {quotes.length > 0 && (
              <section className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
                <div className="text-xs font-semibold text-[var(--foreground)] mb-3 flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-[var(--brand-500)]" />
                  <span>نقل‌قول‌های اندوخته‌شده</span>
                </div>
                <div className="space-y-2.5">
                  {quotes.map(({ note, quotes: qs }) => (
                    <div
                      key={note.id}
                      className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--background-subtle)] p-3.5"
                    >
                      <div className="text-[11px] text-[var(--foreground-subtle)] mb-2">
                        یادداشت: {note.title || "بدون عنوان"}
                      </div>
                      <div className="space-y-2">
                        {qs.map((q, i) => (
                          <blockquote key={i} className="font-display text-sm italic text-[var(--foreground)] leading-relaxed">
                            «{q}»
                          </blockquote>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Cross-Outlet Coverage Cluster */}
            {duplicates && duplicates.length > 0 && (
              <section className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
                <div className="text-xs font-semibold text-[var(--foreground)] mb-3 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[var(--brand-500)]" />
                  <span>پوشش همزمان در سایر رسانه‌ها</span>
                </div>
                <div className="space-y-1.5">
                  {duplicates.slice(0, 4).map(d => (
                    <button
                      type="button"
                      key={d.article.id}
                      onClick={() => onSelectRelated?.(d.article.id)}
                      className="w-full text-right px-3 py-2 rounded-[var(--radius-md)] bg-[var(--background-subtle)] hover:bg-[var(--background-muted)] border border-[var(--border-subtle)] transition-colors cursor-pointer flex items-center justify-between gap-3"
                    >
                      <span className="text-xs font-medium text-[var(--foreground)] truncate">{d.article.title}</span>
                      <span className="text-[11px] text-[var(--foreground-subtle)] shrink-0">{d.article.source}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Related Stories */}
            {related && related.length > 0 && (
              <section className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
                <div className="text-xs font-semibold text-[var(--foreground)] mb-3">
                  مطالب مرتبط پیشنهادی
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {related.slice(0, 6).map(r => (
                    <motion.button
                      type="button"
                      key={r.article.id}
                      whileHover={{ y: -1.5 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => onSelectRelated?.(r.article.id)}
                      className="text-right p-3 rounded-[var(--radius-md)] bg-[var(--background-subtle)] hover:bg-[var(--background-muted)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                    >
                      <div className="text-[11px] text-[var(--foreground-subtle)] mb-1 tabular-nums">
                        {r.article.source} · {Math.round(r.score * 100).toLocaleString("fa-IR")}٪ قرابت معنایی
                      </div>
                      <div className="text-xs font-semibold text-[var(--foreground)] line-clamp-2 leading-relaxed">
                        {r.article.title}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>
            )}
          </motion.article>
        </AnimatePresence>
      </div>
    </aside>
  );
}
