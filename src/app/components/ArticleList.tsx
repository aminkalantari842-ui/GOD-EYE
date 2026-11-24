import {
  Star, CheckCheck, RefreshCw, LayoutGrid, List, Newspaper, Share2,
  ArrowDownAZ, ArrowUpZA, Calendar, Inbox, Languages, Loader2, Check, Eye,
} from "lucide-react";
import { useMemo, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Article } from "../data";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  SPRING_POP,
  SPRING_SNAPPY,
  TRANSITION_EDITORIAL,
  TRANSITION_FAST,
  computeStaggerDelay,
  detectTextDirection,
} from "../motion/editorialMotion";

function EditorialCardMedia({
  src,
  alt,
  wrapperClassName,
  imgClassName,
}: {
  src?: string;
  alt: string;
  wrapperClassName: string;
  imgClassName: string;
}) {
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setInvalid(false);
  }, [src]);
  if (!src || invalid) return null;
  return (
    <div className={wrapperClassName}>
      <ImageWithFallback
        src={src}
        alt={alt}
        hideOnError
        onInvalidImage={() => setInvalid(true)}
        className={imgClassName}
      />
    </div>
  );
}

// Fallback language guess for cached/legacy articles that lack a server `lang`.
function looksNonPersian(title: string): boolean {
  const t = String(title || "");
  if (!t.trim()) return false;
  const arabicScript = (t.match(/[؀-ۿ]/g) || []).length;
  const latin = (t.match(/[A-Za-zЀ-ӿͰ-Ͽ]/g) || []).length;
  return latin > 0 && latin >= arabicScript;
}

function needsFa(a: Article): boolean {
  if (a.titleTranslated || !a.title) return false;
  return a.lang ? a.lang !== "fa" : looksNonPersian(a.title);
}

const ROW_H = 68;
const VIRT_THRESHOLD = 90;

export type SortMode = 'newest' | 'oldest' | 'source';

type Props = {
  articles: Article[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  viewMode: 'cards' | 'list' | 'magazine';
  setViewMode: (v: 'cards' | 'list' | 'magazine') => void;
  title: string;
  toggleStar: (id: string) => void;
  sortMode?: SortMode;
  setSortMode?: (s: SortMode) => void;
  onRefresh?: () => void;
  onMarkAllRead?: () => void;
  loading?: boolean;
  translateAll?: boolean;
  onToggleTranslateAll?: () => void;
  onTranslate?: (ids: string[]) => void;
  translatingIds?: Set<string>;
  subHeader?: ReactNode;
};

function parseDate(s: string): number {
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
}

export function ArticleList({
  articles, selectedId, setSelectedId, viewMode, setViewMode, title,
  toggleStar, sortMode = 'newest', setSortMode, onRefresh, onMarkAllRead,
  loading, translateAll = false, onToggleTranslateAll, onTranslate,
  translatingIds, subHeader,
}: Props) {
  const [quickUnreadOnly, setQuickUnreadOnly] = useState(false);
  const [sharedCopied, setSharedCopied] = useState(false);

  const sorted = useMemo(() => {
    const base = quickUnreadOnly ? articles.filter(a => !a.read) : articles;
    const arr = [...base];
    if (sortMode === 'newest') arr.sort((a, b) => (b.dateMs ?? parseDate(b.date)) - (a.dateMs ?? parseDate(a.date)));
    else if (sortMode === 'oldest') arr.sort((a, b) => (a.dateMs ?? parseDate(a.date)) - (b.dateMs ?? parseDate(b.date)));
    else if (sortMode === 'source') arr.sort((a, b) => a.source.localeCompare(b.source, 'fa'));
    return arr;
  }, [articles, sortMode, quickUnreadOnly]);

  const selectedRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [vRange, setVRange] = useState({ start: 0, end: 60 });

  const virtualize = viewMode === 'list' && sorted.length > VIRT_THRESHOLD;

  useEffect(() => {
    if (!virtualize) {
      selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const top = el.scrollTop;
      const h = el.clientHeight;
      const start = Math.max(0, Math.floor(top / ROW_H) - 8);
      const end = Math.min(sorted.length, Math.ceil((top + h) / ROW_H) + 8);
      setVRange({ start, end });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, [virtualize, sorted.length, selectedId]);

  useEffect(() => {
    if (!virtualize) return;
    const idx = sorted.findIndex(a => a.id === selectedId);
    if (idx < 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const top = idx * ROW_H;
    if (top < el.scrollTop || top + ROW_H > el.scrollTop + el.clientHeight) {
      el.scrollTo({ top: top - el.clientHeight / 2, behavior: 'smooth' });
    }
  }, [selectedId, virtualize, sorted]);

  useEffect(() => {
    if (!translateAll || !onTranslate) return;
    const root = scrollRef.current;
    if (!root) return;
    let queued = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      if (queued.size) { onTranslate(Array.from(queued)); queued = new Set(); }
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const id = (e.target as HTMLElement).dataset.aid;
          if (id) queued.add(id);
        }
      }
      clearTimeout(timer);
      timer = setTimeout(flush, 300);
    }, { root, rootMargin: "300px 0px" });
    const observe = () => root.querySelectorAll("[data-aid]").forEach(el => io.observe(el));
    observe();
    const mo = new MutationObserver(observe);
    mo.observe(root, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); clearTimeout(timer); };
  }, [translateAll, onTranslate, viewMode, sorted]);

  const SortIcon = sortMode === 'oldest' ? ArrowUpZA : sortMode === 'source' ? ArrowDownAZ : Calendar;
  const nextSort: SortMode = sortMode === 'newest' ? 'oldest' : sortMode === 'oldest' ? 'source' : 'newest';
  const sortLabel = sortMode === 'newest' ? 'جدیدترین' : sortMode === 'oldest' ? 'قدیمی‌ترین' : 'بر اساس منبع';
  const isEmpty = !loading && sorted.length === 0;

  const shareCurrentView = () => {
    try {
      navigator.clipboard?.writeText(window.location.href);
      setSharedCopied(true);
      toast.success("پیوند نمای فعلی کپی شد");
      setTimeout(() => setSharedCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  const TransBtn = ({ a }: { a: Article }) => {
    if (!onTranslate || !needsFa(a)) return null;
    const busy = translatingIds?.has(a.id);
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onTranslate([a.id]); }}
        disabled={busy}
        aria-label="ترجمهٔ تیتر به فارسی"
        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--foreground-subtle)] hover:text-[var(--brand-600)] dark:hover:text-[var(--brand-400)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
        title="ترجمهٔ این تیتر به فارسی"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
      </button>
    );
  };

  const StarButton = ({ a }: { a: Article }) => (
    <motion.button
      type="button"
      whileTap={{ scale: 0.78 }}
      transition={SPRING_POP}
      onClick={(e) => { e.stopPropagation(); toggleStar(a.id); }}
      aria-label={a.starred ? `حذف نشان «${a.title.slice(0, 30)}»` : `نشان کردن «${a.title.slice(0, 30)}»`}
      aria-pressed={a.starred}
      className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer shrink-0"
    >
      <motion.span
        key={a.starred ? "starred" : "unstarred"}
        initial={{ scale: 0.75 }}
        animate={{ scale: 1 }}
        transition={SPRING_POP}
        className="grid place-items-center"
      >
        <Star
          className={`w-4 h-4 transition-colors ${
            a.starred
              ? "fill-amber-400 text-amber-400"
              : "text-[var(--foreground-subtle)] hover:text-[var(--foreground)]"
          }`}
        />
      </motion.span>
    </motion.button>
  );

  const viewModes: { id: 'list' | 'cards' | 'magazine'; label: string; Icon: any }[] = [
    { id: 'list', label: 'لیست', Icon: List },
    { id: 'cards', label: 'کارت‌ها', Icon: LayoutGrid },
    { id: 'magazine', label: 'مجله', Icon: Newspaper },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-w-0 min-h-0 h-full">
      {/* Sticky Frosted Masthead */}
      <div className="glass border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between gap-2 sticky top-0 z-10">
        <div className="flex items-baseline gap-2 min-w-0 shrink">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={title}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={TRANSITION_FAST}
              className="font-display text-[17.5px] font-bold text-[var(--foreground)] truncate"
            >
              {title}
            </motion.h2>
          </AnimatePresence>
          <span className="text-xs text-[var(--foreground-subtle)] tabular-nums shrink-0 whitespace-nowrap">
            {sorted.length.toLocaleString("fa-IR")} مقاله
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onRefresh}
            disabled={loading}
            aria-label="بروزرسانی مقالات"
            className="p-1.5 rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] disabled:opacity-50 transition-colors cursor-pointer"
            title="بروزرسانی (R)"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--brand-500)]' : ''}`} />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onMarkAllRead}
            aria-label="علامت‌گذاری همه به عنوان خوانده‌شده"
            className="p-1.5 rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
            title="علامت‌گذاری همه به عنوان خوانده‌شده"
          >
            <CheckCheck className="w-4 h-4" />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setSortMode?.(nextSort)}
            aria-label={`مرتب‌سازی: ${sortLabel}`}
            className="px-2 py-1.5 rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] flex items-center gap-1 text-xs transition-colors cursor-pointer whitespace-nowrap"
            title={`ترتیب فعلی: ${sortLabel}`}
          >
            <SortIcon className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">{sortLabel}</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setQuickUnreadOnly(v => !v)}
            aria-pressed={quickUnreadOnly}
            aria-label="فقط مقالات خوانده‌نشده"
            className={`px-2 py-1.5 rounded-[var(--radius-md)] flex items-center gap-1 text-xs transition-colors cursor-pointer whitespace-nowrap ${
              quickUnreadOnly
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]"
            }`}
            title="نمایش سریع فقط خوانده‌نشده‌ها"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">نخوانده</span>
          </motion.button>

          {onToggleTranslateAll && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onToggleTranslateAll}
              aria-pressed={translateAll}
              className={`px-2 py-1.5 rounded-[var(--radius-md)] flex items-center gap-1 text-xs transition-colors cursor-pointer whitespace-nowrap ${
                translateAll
                  ? 'bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)]'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]'
              }`}
              title={translateAll ? 'ترجمه خودکار تیترها روشن است' : 'ترجمه همهٔ تیترهای غیرفارسی به فارسی'}
            >
              {translatingIds && translatingIds.size > 0
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Languages className="w-3.5 h-3.5" />}
              <span className="hidden 2xl:inline">ترجمه</span>
            </motion.button>
          )}

          <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />

          {/* Spring LayoutId Segmented View Switcher */}
          <div
            role="group"
            aria-label="حالت نمایش مقالات"
            className="flex items-center bg-[var(--background-muted)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-0.5"
          >
            {viewModes.map(({ id, label, Icon }) => {
              const active = viewMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setViewMode(id)}
                  aria-label={`نمایش ${label}`}
                  aria-pressed={active}
                  title={label}
                  className={`relative p-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                    active ? 'text-[var(--foreground)]' : 'text-[var(--foreground-subtle)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="viewmode-active-pill"
                      transition={SPRING_SNAPPY}
                      className="absolute inset-0 rounded-[var(--radius-sm)] bg-[var(--card)] shadow-[var(--shadow-xs)] border border-[var(--border-subtle)]"
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                </button>
              );
            })}
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={shareCurrentView}
            aria-label="کپی پیوند این نما"
            title="کپی پیوند نما"
            className="p-2 rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
          >
            {sharedCopied ? <Check className="w-4 h-4 text-[var(--brand-500)]" /> : <Share2 className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>

      {subHeader}

      {/* Main Article Stream */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {loading && articles.length === 0 && (
          <div className="divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-start gap-3 animate-pulse">
                <div className="flex-1 space-y-2.5">
                  <div className="h-2.5 w-36 bg-[var(--background-muted)] rounded" />
                  <div className="h-4 w-4/5 bg-[var(--background-muted)] rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={TRANSITION_EDITORIAL}
            className="p-16 text-center text-[var(--foreground-muted)] flex flex-col items-center gap-3"
          >
            <div className="size-12 rounded-[var(--radius-lg)] bg-[var(--background-subtle)] border border-[var(--border-subtle)] grid place-items-center">
              <Inbox className="w-5 h-5 text-[var(--foreground-subtle)]" />
            </div>
            <div className="font-display text-lg font-semibold text-[var(--foreground)]">مقاله‌ای در این نما یافت نشد</div>
            <div className="text-xs text-[var(--foreground-subtle)] max-w-xs">
              {quickUnreadOnly
                ? "همه مقالات این بخش خوانده شده‌اند."
                : "منبع تازه‌ای اضافه کنید یا فیلترهای فعال را تغییر دهید."}
            </div>
            {quickUnreadOnly && (
              <button
                type="button"
                onClick={() => setQuickUnreadOnly(false)}
                className="mt-1 px-3.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium cursor-pointer"
              >
                نمایش همه مقالات
              </button>
            )}
          </motion.div>
        )}

        {/* 1. HIGH-PRECISION EDITORIAL LIST MODE */}
        {viewMode === 'list' && !isEmpty && (
          virtualize ? (
            <div style={{ height: sorted.length * ROW_H, position: 'relative' }}>
              <div className="divide-y divide-[var(--border-subtle)] absolute left-0 right-0" style={{ top: vRange.start * ROW_H }}>
                {sorted.slice(vRange.start, vRange.end).map(a => {
                  const isSelected = selectedId === a.id;
                  return (
                    <div
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(a.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(a.id); } }}
                      style={{ height: ROW_H }}
                      data-aid={a.id}
                      className={`topic-row relative cursor-pointer w-full px-5 flex items-center gap-3 text-right transition-colors ${
                        isSelected
                          ? 'bg-[var(--card)] shadow-[var(--shadow-xs)]'
                          : 'hover:bg-[var(--background-subtle)]'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute right-0 top-2 bottom-2 w-[3px] rounded-l-full bg-[var(--brand-500)]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--foreground-subtle)] mb-1 tabular-nums">
                          {!a.read && (
                            <span className="size-1.5 rounded-full bg-[var(--brand-500)] shrink-0 ml-0.5" aria-label="خوانده‌نشده" />
                          )}
                          <span className="font-medium text-[var(--foreground-muted)] truncate max-w-[130px]">{a.source}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate max-w-[130px]">{a.date}</span>
                          {a.readTime && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{a.readTime}</span>
                            </>
                          )}
                        </div>
                        <div
                          dir={detectTextDirection(a.title)}
                          className={`text-[14px] truncate transition-colors ${
                            detectTextDirection(a.title) === "ltr" ? "text-left" : "text-right"
                          } ${
                            a.read
                              ? 'text-[var(--foreground-muted)] font-normal'
                              : 'text-[var(--foreground)] font-semibold'
                          }`}
                        >
                          {a.title}
                        </div>
                      </div>
                      <TransBtn a={a} />
                      <StarButton a={a} />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {sorted.map((a, idx) => {
                const isSelected = selectedId === a.id;
                return (
                  <motion.div
                    key={a.id}
                    ref={isSelected ? selectedRef : undefined}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...TRANSITION_EDITORIAL, delay: computeStaggerDelay(idx) }}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(a.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(a.id); } }}
                    data-aid={a.id}
                    className={`topic-row relative cursor-pointer w-full px-5 py-3.5 flex items-start gap-3 text-right transition-colors ${
                      isSelected ? '' : 'hover:bg-[var(--background-subtle)]/80'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="article-list-selected-bg"
                        transition={SPRING_SNAPPY}
                        className="absolute inset-0 bg-[var(--card)] shadow-[var(--shadow-xs)] pointer-events-none"
                      />
                    )}
                    {isSelected && (
                      <motion.span
                        layoutId="article-list-selected-edge"
                        transition={SPRING_SNAPPY}
                        className="absolute right-0 top-2 bottom-2 w-[3px] rounded-l-full bg-[var(--brand-500)] z-10 pointer-events-none"
                      />
                    )}
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--foreground-subtle)] mb-1 tabular-nums">
                        {!a.read && (
                          <span className="size-1.5 rounded-full bg-[var(--brand-500)] shrink-0 ml-0.5" aria-label="خوانده‌نشده" />
                        )}
                        <span className="font-medium text-[var(--foreground-muted)] truncate max-w-[140px]">{a.source}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{a.date}</span>
                        {a.readTime && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{a.readTime}</span>
                          </>
                        )}
                      </div>
                      <div
                        dir={detectTextDirection(a.title)}
                        className={`text-[14.5px] leading-snug line-clamp-2 ${
                          detectTextDirection(a.title) === "ltr" ? "text-left" : "text-right"
                        } ${
                          a.read
                            ? 'text-[var(--foreground-muted)] font-normal'
                            : 'text-[var(--foreground)] font-semibold'
                        }`}
                      >
                        {a.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 relative z-10 shrink-0 mt-0.5">
                      <TransBtn a={a} />
                      <StarButton a={a} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        )}

        {/* 2. 3-TIER BROADSHEET CARDS MODE */}
        {viewMode === 'cards' && !isEmpty && (
          <div className="p-5 grid gap-4 grid-cols-1 lg:grid-cols-2">
            {sorted.map((a, idx) => {
              const isLead = idx === 0;
              const isSelected = selectedId === a.id;

              if (isLead) {
                return (
                  <motion.article
                    key={a.id}
                    data-aid={a.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={TRANSITION_EDITORIAL}
                    onClick={() => setSelectedId(a.id)}
                    className={`topic-row group col-span-full cursor-pointer bg-[var(--card)] border rounded-[var(--radius-xl)] overflow-hidden grid grid-cols-1 xl:grid-cols-12 items-stretch transition-colors ${
                      isSelected
                        ? 'border-[var(--brand-500)] ring-2 ring-[var(--ring)]'
                        : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <EditorialCardMedia
                      src={a.image}
                      alt={a.title}
                      wrapperClassName="xl:col-span-6 h-56 xl:h-full min-h-[220px] overflow-hidden bg-[var(--background-muted)]"
                      imgClassName="w-full h-full object-cover editorial-img-zoom"
                    />
                    <div className="xl:col-span-6 first:xl:col-span-12 p-5 xl:p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-subtle)] mb-2.5 tabular-nums">
                          {!a.read && <span className="size-1.5 rounded-full bg-[var(--brand-500)] ml-0.5" aria-label="خوانده‌نشده" />}
                          <span className="font-semibold text-[var(--brand-600)] dark:text-[var(--brand-400)]">{a.source}</span>
                          {a.author && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{a.author}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>{a.date}</span>
                        </div>
                        <h3
                          dir={detectTextDirection(a.title)}
                          className={`font-display text-[20px] xl:text-[22px] leading-snug mb-2.5 text-balance ${
                            detectTextDirection(a.title) === "ltr" ? "text-left" : "text-right"
                          } ${
                            a.read ? 'text-[var(--foreground-muted)] font-semibold' : 'text-[var(--foreground)] font-bold'
                          }`}
                        >
                          {a.title}
                        </h3>
                        <p
                          dir={detectTextDirection(a.preview)}
                          className={`text-sm text-[var(--foreground-muted)] line-clamp-3 leading-relaxed ${
                            detectTextDirection(a.preview) === "ltr" ? "text-left" : "text-right"
                          }`}
                        >
                          {a.preview}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--foreground-subtle)] tabular-nums">
                        <span>{a.readTime ? `${a.readTime} مطالعه` : 'گزارش ویژه'}</span>
                        <div className="flex items-center gap-1">
                          <TransBtn a={a} />
                          <StarButton a={a} />
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              }

              return (
                <motion.article
                  key={a.id}
                  data-aid={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...TRANSITION_EDITORIAL, delay: computeStaggerDelay(idx) }}
                  whileHover={{ y: -2 }}
                  onClick={() => setSelectedId(a.id)}
                  className={`topic-row group cursor-pointer bg-[var(--card)] border rounded-[var(--radius-lg)] overflow-hidden flex flex-col transition-colors ${
                    isSelected
                      ? 'border-[var(--brand-500)] ring-2 ring-[var(--ring)]'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <EditorialCardMedia
                    src={a.image}
                    alt={a.title}
                    wrapperClassName="h-44 overflow-hidden bg-[var(--background-muted)]"
                    imgClassName="w-full h-full object-cover editorial-img-zoom"
                  />
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--foreground-subtle)] mb-2 tabular-nums">
                        {!a.read && <span className="size-1.5 rounded-full bg-[var(--brand-500)] ml-0.5" aria-label="خوانده‌نشده" />}
                        <span className="font-medium text-[var(--foreground-muted)] truncate">{a.source}</span>
                        <span aria-hidden="true">·</span>
                        <span>{a.date}</span>
                      </div>
                      <h3
                        dir={detectTextDirection(a.title)}
                        className={`font-display text-[16.5px] leading-snug mb-2 line-clamp-2 text-balance ${
                          detectTextDirection(a.title) === "ltr" ? "text-left" : "text-right"
                        } ${
                          a.read ? 'text-[var(--foreground-muted)] font-medium' : 'text-[var(--foreground)] font-bold'
                        }`}
                      >
                        {a.title}
                      </h3>
                      <p
                        dir={detectTextDirection(a.preview)}
                        className={`text-[13px] text-[var(--foreground-muted)] line-clamp-2 leading-relaxed mb-3 ${
                          detectTextDirection(a.preview) === "ltr" ? "text-left" : "text-right"
                        }`}
                      >
                        {a.preview}
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--foreground-subtle)] tabular-nums">
                      <span>{a.readTime}</span>
                      <div className="flex items-center gap-0.5">
                        <TransBtn a={a} />
                        <StarButton a={a} />
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {/* 3. CURATORIAL MAGAZINE MODE */}
        {viewMode === 'magazine' && !isEmpty && (
          <div className="p-6 divide-y divide-[var(--border-subtle)]">
            {sorted.map((a, idx) => {
              const isSelected = selectedId === a.id;
              return (
                <motion.article
                  key={a.id}
                  data-aid={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...TRANSITION_EDITORIAL, delay: computeStaggerDelay(idx) }}
                  onClick={() => setSelectedId(a.id)}
                  className={`topic-row group cursor-pointer flex flex-col sm:flex-row gap-5 py-5 first:pt-1 rounded-[var(--radius-md)] transition-colors ${
                    isSelected ? 'bg-[var(--card)] px-4 -mx-4 border border-[var(--border-subtle)] shadow-[var(--shadow-xs)]' : ''
                  }`}
                >
                  <EditorialCardMedia
                    src={a.image}
                    alt={a.title}
                    wrapperClassName="w-full sm:w-48 h-32 shrink-0 rounded-[var(--radius-md)] overflow-hidden bg-[var(--background-muted)] border border-[var(--border-subtle)]"
                    imgClassName="w-full h-full object-cover editorial-img-zoom"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-subtle)] mb-1.5 tabular-nums flex-wrap">
                        {!a.read && <span className="size-1.5 rounded-full bg-[var(--brand-500)] ml-0.5" aria-label="خوانده‌نشده" />}
                        <span className="font-semibold text-[var(--foreground-muted)]">{a.source}</span>
                        {a.author && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{a.author}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{a.date}</span>
                      </div>
                      <h3
                        dir={detectTextDirection(a.title)}
                        className={`font-display text-[18px] leading-snug mb-1.5 text-balance ${
                          detectTextDirection(a.title) === "ltr" ? "text-left" : "text-right"
                        } ${
                          a.read ? 'text-[var(--foreground-muted)] font-medium' : 'text-[var(--foreground)] font-bold'
                        }`}
                      >
                        {a.title}
                      </h3>
                      <p
                        dir={detectTextDirection(a.preview)}
                        className={`text-[13.5px] text-[var(--foreground-muted)] line-clamp-2 leading-relaxed ${
                          detectTextDirection(a.preview) === "ltr" ? "text-left" : "text-right"
                        }`}
                      >
                        {a.preview}
                      </p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs text-[var(--foreground-subtle)] tabular-nums">
                      <span>{a.readTime ? `${a.readTime} مطالعه` : ''}</span>
                      <div className="flex items-center gap-1">
                        <TransBtn a={a} />
                        <StarButton a={a} />
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
