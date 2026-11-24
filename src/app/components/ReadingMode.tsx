import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Type, Minus, Plus, Sun, Moon, Coffee, AlignLeft, AlignJustify, Volume2, VolumeX, Star, Bookmark, ExternalLink, Sparkles, Highlighter, Quote as QuoteIcon, Trash2, Map as MapIcon, Target } from "lucide-react";
import type { Article } from "../data";
import {
  summarize, extractQuotes, readability, personalReadTime, recordReadSpeed,
  getHighlights, addHighlight, removeHighlight, updateHighlight,
  savePosition, getPosition, todayProgress,
  type Highlight, type SummaryLevel, type StructuredSummary,
} from "../readingStudio";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SPRING_SILK, SPRING_SNAPPY, clampReadingProgress, detectTextDirection } from "../motion/editorialMotion";

type Theme = "light" | "dark" | "sepia";
type Width = "narrow" | "medium" | "wide";
type Align = "right" | "justify";

type Props = {
  article: Article;
  onClose: () => void;
  onToggleStar?: (id: string) => void;
  onToggleSave?: (id: string) => void;
  isSaved?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
};

const FONTS = [
  { id: "vazir", label: "وزیرمتن", css: "Vazirmatn, Tahoma, sans-serif" },
  { id: "iransans", label: "ایران‌سنس", css: "'IRANSans', Tahoma, sans-serif" },
  { id: "shabnam", label: "شبنم", css: "Shabnam, Tahoma, sans-serif" },
  { id: "serif", label: "سریف", css: "Georgia, 'Times New Roman', serif" },
];

const WIDTH_PX: Record<Width, string> = { narrow: "580px", medium: "720px", wide: "880px" };

export function ReadingMode({ article, onClose, onToggleStar, onToggleSave, isSaved, onPrev, onNext }: Props) {
  const stored = (k: string, fb: string) => { try { return localStorage.getItem(k) || fb; } catch { return fb; } };
  const storedNum = (k: string, fb: number) => { try { return Number(localStorage.getItem(k)) || fb; } catch { return fb; } };

  const [theme, setTheme] = useState<Theme>(stored("rm.theme", "light") as Theme);
  const [fontSize, setFontSize] = useState<number>(storedNum("rm.fs", 18));
  const [lineHeight, setLineHeight] = useState<number>(storedNum("rm.lh", 1.95));
  const [width, setWidth] = useState<Width>(stored("rm.w", "medium") as Width);
  const [align, setAlign] = useState<Align>(stored("rm.al", "justify") as Align);
  const [font, setFont] = useState(stored("rm.font", "vazir"));
  const [progress, setProgress] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const articleBodyRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const resumedRef = useRef<boolean>(false);

  const [panel, setPanel] = useState<null | "summary" | "highlights" | "quotes" | "minimap">(null);
  const [summaryLevel, setSummaryLevel] = useState<SummaryLevel>("short");
  const [highlights, setHighlights] = useState<Highlight[]>(() => getHighlights(article.id));
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [heroHidden, setHeroHidden] = useState(false);

  useEffect(() => { setHighlights(getHighlights(article.id)); setHeroHidden(false); resumedRef.current = false; startTimeRef.current = Date.now(); }, [article.id]);

  useEffect(() => { localStorage.setItem("rm.theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("rm.fs", String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem("rm.lh", String(lineHeight)); }, [lineHeight]);
  useEffect(() => { localStorage.setItem("rm.w", width); }, [width]);
  useEffect(() => { localStorage.setItem("rm.al", align); }, [align]);
  useEffect(() => { localStorage.setItem("rm.font", font); }, [font]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const pct = clampReadingProgress(el.scrollTop, el.scrollHeight, el.clientHeight);
      setProgress(pct);
      savePosition(article.id, pct);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [article?.id]);

  useEffect(() => {
    if (resumedRef.current) return;
    const t = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const saved = getPosition(article.id);
      if (saved && saved > 0.1) {
        const max = el.scrollHeight - el.clientHeight;
        el.scrollTo({ top: saved * max, behavior: "smooth" });
      }
      resumedRef.current = true;
    }, 200);
    return () => clearTimeout(t);
  }, [article.id]);

  useEffect(() => {
    return () => {
      const seconds = (Date.now() - startTimeRef.current) / 1000;
      const words = (article.content || article.preview || "").trim().split(/\s+/).filter(Boolean).length;
      if (progress > 0.7) recordReadSpeed(Math.round(words * progress), seconds);
    };
  }, [article.id, progress]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "j" || e.key === "ArrowDown") containerRef.current?.scrollBy({ top: 300, behavior: "smooth" });
      else if (e.key === "k" || e.key === "ArrowUp") containerRef.current?.scrollBy({ top: -300, behavior: "smooth" });
      else if (e.key === "ArrowLeft") onNext?.();
      else if (e.key === "ArrowRight") onPrev?.();
      else if (e.key.toLowerCase() === "s") setPanel(p => p === "summary" ? null : "summary");
      else if (e.key.toLowerCase() === "h") setPanel(p => p === "highlights" ? null : "highlights");
      else if (e.key.toLowerCase() === "q") setPanel(p => p === "quotes" ? null : "quotes");
      else if (e.key.toLowerCase() === "m") setPanel(p => p === "minimap" ? null : "minimap");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev]);

  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch {} }, []);

  const speak = () => {
    try {
      if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
      const text = `${article.title}. ${article.content || article.preview || ""}`;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fa-IR";
      u.rate = 1.0;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
      setSpeaking(true);
    } catch {}
  };

  const themeClasses = useMemo(() => {
    if (theme === "sepia") return "bg-[#F6EFE0] text-[#352A15]";
    if (theme === "dark") return "bg-[#0C0E0D] text-[#EEF2F0]";
    return "bg-[#FCFBF9] text-[#111413]";
  }, [theme]);

  const fontFamily = FONTS.find(f => f.id === font)?.css || FONTS[0].css;
  const wordCount = (article.content || "").trim().split(/\s+/).filter(Boolean).length;
  const remainingMin = Math.max(1, Math.round((1 - progress) * personalReadTime(wordCount)));

  const paragraphs = (article.content || article.preview || "").split(/\n{2,}|\n/).filter(Boolean);

  const fullText = useMemo(() => (article.content || article.preview || ""), [article.content, article.preview]);
  const summary = useMemo(() => summarize(fullText, summaryLevel), [fullText, summaryLevel]);
  const quotes = useMemo(() => extractQuotes(fullText), [fullText]);
  const stats = useMemo(() => readability(fullText), [fullText]);
  const goal = todayProgress([]);

  const onTextMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 4) { setSelection(null); return; }
    const range = sel!.getRangeAt(0);
    setSelection({ text, rect: range.getBoundingClientRect() });
  };

  const applyHighlight = (color: Highlight["color"]) => {
    if (!selection) return;
    const h = addHighlight({ articleId: article.id, text: selection.text, color });
    setHighlights(prev => [...prev, h]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const renderHighlightedParagraph = (p: string, idx: number) => {
    if (highlights.length === 0) return <p key={idx}>{p}</p>;
    const ranges: { start: number; end: number; color: Highlight["color"] }[] = [];
    for (const h of highlights) {
      let from = 0;
      while (true) {
        const i = p.indexOf(h.text, from);
        if (i < 0) break;
        ranges.push({ start: i, end: i + h.text.length, color: h.color });
        from = i + h.text.length;
      }
    }
    if (ranges.length === 0) return <p key={idx}>{p}</p>;
    ranges.sort((a, b) => a.start - b.start);
    const parts: any[] = [];
    let cursor = 0;
    const colorClass: Record<Highlight["color"], string> = {
      yellow: "bg-yellow-200/70 dark:bg-yellow-500/30",
      green: "bg-emerald-200/70 dark:bg-emerald-500/30",
      blue: "bg-sky-200/70 dark:bg-sky-500/30",
      rose: "bg-rose-200/70 dark:bg-rose-500/30",
    };
    for (const r of ranges) {
      if (r.start < cursor) continue;
      if (r.start > cursor) parts.push(p.slice(cursor, r.start));
      parts.push(<mark key={`${idx}-${r.start}`} className={`${colorClass[r.color]} rounded px-0.5`}>{p.slice(r.start, r.end)}</mark>);
      cursor = r.end;
    }
    if (cursor < p.length) parts.push(p.slice(cursor));
    return <p key={idx}>{parts}</p>;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`fixed inset-0 z-50 transition-colors duration-300 ${themeClasses}`}
      dir="rtl"
    >
      {/* Compositor-only reading progress ribbon */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-current/10 z-20 overflow-hidden">
        <div
          className="h-full w-full bg-emerald-500 origin-right transition-transform duration-150 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <div ref={containerRef} className="h-full overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_SILK}
          className="mx-auto px-6 pt-20 pb-36"
          style={{ maxWidth: WIDTH_PX[width], fontFamily, fontSize: `${fontSize}px`, lineHeight }}
        >
          {article.image && !heroHidden && (
            <div className="rounded-2xl overflow-hidden mb-9 border border-current/10">
              <ImageWithFallback
                src={article.image}
                alt={article.title}
                hideOnError
                onInvalidImage={() => setHeroHidden(true)}
                className="w-full max-h-[420px] object-cover"
              />
            </div>
          )}
          <div className="text-xs opacity-65 mb-3.5 flex items-center gap-2 flex-wrap tabular-nums">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{article.source}</span>
            {article.author && <><span>·</span><span>{article.author}</span></>}
            {article.date && <><span>·</span><span>{article.date}</span></>}
            <span>·</span><span>{article.readTime || `${Math.ceil(wordCount / 200)} دقیقه`}</span>
          </div>
          <h1
            dir={detectTextDirection(article.title)}
            style={{ fontSize: `${Math.round(fontSize * 1.85)}px`, lineHeight: 1.38 }}
            className={`mb-6 font-bold tracking-tight ${detectTextDirection(article.title) === "ltr" ? "text-left" : "text-right"}`}
          >
            {article.title}
          </h1>
          {article.preview && (
            <p
              dir={detectTextDirection(article.preview)}
              className={`opacity-80 mb-8 pb-6 border-b border-current/10 font-medium ${detectTextDirection(article.preview) === "ltr" ? "text-left" : "text-right"}`}
              style={{ fontSize: `${Math.round(fontSize * 1.06)}px` }}
            >
              {article.preview}
            </p>
          )}
          <div
            ref={articleBodyRef}
            dir={detectTextDirection(fullText)}
            onMouseUp={onTextMouseUp}
            onTouchEnd={onTextMouseUp}
            className="space-y-6"
            style={{ textAlign: align === "justify" ? "justify" : detectTextDirection(fullText) === "ltr" ? "left" : "right" }}
          >
            {paragraphs.map((p, i) => renderHighlightedParagraph(p, i))}
          </div>
          <div className="mt-14 pt-6 border-t border-current/10 flex items-center justify-between text-xs opacity-65 tabular-nums">
            <span>{remainingMin.toLocaleString("fa-IR")} دقیقه تا پایان مطالعه</span>
            {article.link && (
              <a href={article.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:opacity-100 font-medium">
                مشاهده در وب‌سایت مرجع <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </motion.div>
      </div>

      {/* Top Right: Paper Theme Selector with shared layoutId */}
      <div className="absolute top-4 right-4 flex items-center gap-0.5 bg-black/5 dark:bg-white/10 backdrop-blur-md rounded-xl p-1 border border-current/10">
        {([
          { id: "light" as Theme, icon: Sun, title: "کاغذ روشن" },
          { id: "sepia" as Theme, icon: Coffee, title: "کاغذ کاهی" },
          { id: "dark" as Theme, icon: Moon, title: "شب تیره" },
        ]).map(({ id, icon: Icon, title }) => {
          const active = theme === id;
          return (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={`relative p-2 rounded-lg transition-colors ${active ? "text-emerald-600 dark:text-emerald-400" : "opacity-65 hover:opacity-100"}`}
              title={title}
            >
              {active && (
                <motion.span
                  layoutId="rm-theme-pill"
                  transition={SPRING_SNAPPY}
                  className="absolute inset-0 rounded-lg bg-white/90 dark:bg-white/15 shadow-xs"
                />
              )}
              <Icon className="w-3.5 h-3.5 relative z-10" />
            </button>
          );
        })}
      </div>

      {/* Top Left: Studio Tools & Close */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5">
        <button onClick={() => setPanel(panel === "summary" ? null : "summary")} className={`p-2 rounded-xl border border-current/10 backdrop-blur-md transition-colors ${panel === "summary" ? "bg-emerald-600 text-white border-emerald-600" : "bg-black/5 dark:bg-white/10 hover:bg-black/10"}`} title="خلاصه هوشمند (s)">
          <Sparkles className="w-4 h-4" />
        </button>
        <button onClick={() => setPanel(panel === "highlights" ? null : "highlights")} className={`relative p-2 rounded-xl border border-current/10 backdrop-blur-md transition-colors ${panel === "highlights" ? "bg-amber-500 text-white border-amber-500" : "bg-black/5 dark:bg-white/10 hover:bg-black/10"}`} title="هایلایت‌ها (h)">
          <Highlighter className="w-4 h-4" />
          {highlights.length > 0 && <span className="absolute -top-1 -left-1 bg-amber-500 text-white text-[9px] font-bold tabular-nums rounded-full px-1.5">{highlights.length}</span>}
        </button>
        <button onClick={() => setPanel(panel === "quotes" ? null : "quotes")} className={`p-2 rounded-xl border border-current/10 backdrop-blur-md transition-colors ${panel === "quotes" ? "bg-emerald-600 text-white border-emerald-600" : "bg-black/5 dark:bg-white/10 hover:bg-black/10"}`} title="نقل‌قول‌ها (q)">
          <QuoteIcon className="w-4 h-4" />
        </button>
        <button onClick={() => setPanel(panel === "minimap" ? null : "minimap")} className={`p-2 rounded-xl border border-current/10 backdrop-blur-md transition-colors ${panel === "minimap" ? "bg-emerald-600 text-white border-emerald-600" : "bg-black/5 dark:bg-white/10 hover:bg-black/10"}`} title="نقشهٔ مقاله (m)">
          <MapIcon className="w-4 h-4" />
        </button>
        <button onClick={onClose} className="p-2 rounded-xl border border-current/10 bg-black/5 dark:bg-white/10 hover:bg-black/15 backdrop-blur-md transition-colors" title="بستن حالت مطالعه (Esc)" aria-label="بستن حالت مطالعه">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Text Selection Highlight Popover */}
      <AnimatePresence>
        {selection && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 6 }}
            transition={SPRING_SNAPPY}
            className="fixed z-50 flex items-center gap-1.5 bg-zinc-900 text-white rounded-full shadow-2xl px-2.5 py-1.5"
            style={{ top: Math.max(8, selection.rect.top - 46), left: Math.max(8, selection.rect.left + selection.rect.width / 2 - 80) }}
          >
            {(["yellow", "green", "blue", "rose"] as Highlight["color"][]).map(c => (
              <button key={c} onClick={() => applyHighlight(c)} className="w-5 h-5 rounded-full border border-white/30 hover:scale-110 transition-transform"
                style={{ background: c === "yellow" ? "#facc15" : c === "green" ? "#10b981" : c === "blue" ? "#38bdf8" : "#f43f5e" }}
                title={`هایلایت ${c}`} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Studio Side Drawer */}
      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.98 }}
            transition={SPRING_SILK}
            className="absolute top-16 right-4 bottom-20 w-80 max-w-[90vw] bg-card text-foreground rounded-2xl shadow-2xl border border-border z-30 flex flex-col overflow-hidden"
            dir="rtl"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <div className="text-xs font-semibold flex-1">
                {panel === "summary" && "خلاصهٔ تحلیلی"}
                {panel === "highlights" && `هایلایت‌ها (${highlights.length.toLocaleString("fa-IR")})`}
                {panel === "quotes" && `نقل‌قول‌های شاخص (${quotes.length.toLocaleString("fa-IR")})`}
                {panel === "minimap" && "نقشهٔ پرش مقاله"}
              </div>
              <button onClick={() => setPanel(null)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"><X className="w-3.5 h-3.5" /></button>
            </div>

            {panel === "summary" && (
              <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed">
                <div className="flex items-center gap-1 mb-3.5 p-0.5 rounded-lg bg-muted">
                  {(["tldr", "short", "structured"] as SummaryLevel[]).map(l => (
                    <button key={l} onClick={() => setSummaryLevel(l)}
                      className={`flex-1 text-[11px] font-medium py-1 rounded-md transition-colors ${summaryLevel === l ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}>
                      {l === "tldr" ? "تک‌خطی" : l === "short" ? "چکیده" : "ساختاریافته"}
                    </button>
                  ))}
                </div>
                {summaryLevel === "structured" ? (
                  <div className="space-y-2.5">
                    {Object.entries(summary as StructuredSummary).map(([k, v]) => v && (
                      <div key={k} className="p-2.5 rounded-xl bg-muted/50 border border-border/60">
                        <div className="text-[10px] font-semibold text-primary mb-0.5">
                          {k === "what" ? "رویداد اصلی" : k === "who" ? "کنشگران" : k === "where" ? "مکان" : k === "when" ? "زمان" : "اهمیت"}
                        </div>
                        <div className="text-xs leading-relaxed">{v}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs leading-7 text-foreground/90">{summary as string}</p>
                )}
                <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
                  <span>{stats.words.toLocaleString("fa-IR")} واژه</span>
                  <span>·</span>
                  <span>{stats.sentences.toLocaleString("fa-IR")} جمله</span>
                  <span>·</span>
                  <span className="font-medium text-foreground">{stats.level}</span>
                </div>
              </div>
            )}

            {panel === "highlights" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {highlights.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    بخشی از متن را انتخاب کنید تا به دفترچهٔ هایلایت اضافه شود.
                  </div>
                )}
                {highlights.map(h => (
                  <div key={h.id} className="rounded-xl p-3 border border-border bg-muted/40">
                    <div className="flex items-start gap-2">
                      <span
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ background: h.color === "yellow" ? "#facc15" : h.color === "green" ? "#10b981" : h.color === "blue" ? "#38bdf8" : "#f43f5e" }}
                      />
                      <div className="text-xs leading-relaxed flex-1">{h.text}</div>
                    </div>
                    {editingNote === h.id ? (
                      <div className="mt-2">
                        <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
                          rows={2} className="w-full text-[11px] bg-background border border-border rounded-lg p-2 outline-none focus:border-primary" />
                        <div className="flex gap-1.5 mt-1.5">
                          <button onClick={() => { updateHighlight(h.id, { note: noteDraft }); setHighlights(getHighlights(article.id)); setEditingNote(null); }}
                            className="text-[10px] font-medium px-2.5 py-1 bg-primary text-primary-foreground rounded-md">ذخیره</button>
                          <button onClick={() => setEditingNote(null)} className="text-[10px] px-2.5 py-1 bg-muted rounded-md">انصراف</button>
                        </div>
                      </div>
                    ) : h.note ? (
                      <div className="mt-1.5 text-[11px] text-muted-foreground cursor-pointer" onClick={() => { setEditingNote(h.id); setNoteDraft(h.note || ""); }}>{h.note}</div>
                    ) : null}
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <button onClick={() => { setEditingNote(h.id); setNoteDraft(h.note || ""); }} className="hover:text-primary">{h.note ? "ویرایش یادداشت" : "افزودن یادداشت"}</button>
                      <button onClick={() => { removeHighlight(h.id); setHighlights(getHighlights(article.id)); }} className="hover:text-destructive flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {panel === "quotes" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {quotes.length === 0 && <div className="text-xs text-muted-foreground text-center py-8">نقل‌قول مستقیمی در این متن یافت نشد.</div>}
                {quotes.map((q, i) => (
                  <div key={i} className="rounded-xl p-3 bg-muted/40 border border-border">
                    <div className="text-xs leading-relaxed text-foreground/90">«{q.text}»</div>
                    {q.speaker && <div className="text-[10px] font-medium text-primary mt-1.5">— {q.speaker}</div>}
                  </div>
                ))}
              </div>
            )}

            {panel === "minimap" && (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="text-[10px] text-muted-foreground mb-2">پرش مستقیم به هر بند از مقاله:</div>
                <div className="space-y-1">
                  {paragraphs.map((p, i) => {
                    const target = (i / Math.max(1, paragraphs.length - 1));
                    const active = Math.abs(progress - target) < 1 / Math.max(2, paragraphs.length);
                    return (
                      <button key={i}
                        onClick={() => {
                          const el = containerRef.current; if (!el) return;
                          el.scrollTo({ top: target * (el.scrollHeight - el.clientHeight), behavior: "smooth" });
                        }}
                        className={`w-full text-right text-[11px] line-clamp-2 px-2.5 py-1.5 rounded-lg transition-colors ${active ? "bg-primary text-primary-foreground font-medium" : "hover:bg-accent text-foreground/85"}`}>
                        <span className="opacity-60 ml-1 tabular-nums">{(i + 1).toLocaleString("fa-IR")}.</span>
                        {p.slice(0, 80)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reading Goal Badge (Desktop) */}
      <div className="hidden md:block absolute bottom-5 right-5 bg-card/90 backdrop-blur-md rounded-xl shadow-lg border border-border px-3 py-2 text-foreground" dir="rtl">
        <div className="flex items-center gap-2 text-[11px]">
          <Target className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium">هدف مطالعهٔ روزانه</span>
          <span className="tabular-nums text-muted-foreground">{goal.read.toLocaleString("fa-IR")}/{goal.total.toLocaleString("fa-IR")}</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden mt-1.5 w-36">
          <div className="h-full bg-primary origin-right transition-transform" style={{ transform: `scaleX(${Math.min(1, goal.pct)})` }} />
        </div>
      </div>

      {/* Floating Typography Control Dock */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_SILK}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-900/92 dark:bg-zinc-900/95 text-white backdrop-blur-md rounded-2xl border border-white/10 px-2.5 py-1.5 shadow-2xl max-w-[95vw] overflow-x-auto no-scrollbar"
      >
        <button onClick={() => setFontSize(s => Math.max(13, s - 1))} className="p-1.5 rounded-lg hover:bg-white/10" title="کوچکتر"><Minus className="w-3.5 h-3.5" /></button>
        <Type className="w-3.5 h-3.5 opacity-60 shrink-0" />
        <span className="text-[11px] tabular-nums w-6 text-center font-medium">{fontSize}</span>
        <button onClick={() => setFontSize(s => Math.min(30, s + 1))} className="p-1.5 rounded-lg hover:bg-white/10" title="بزرگتر"><Plus className="w-3.5 h-3.5" /></button>
        <span className="w-px h-4 bg-white/15 mx-1 shrink-0" />
        <select value={font} onChange={e => setFont(e.target.value)}
          className="bg-transparent text-[11px] outline-none cursor-pointer px-1">
          {FONTS.map(f => <option key={f.id} value={f.id} className="text-zinc-900">{f.label}</option>)}
        </select>
        <span className="w-px h-4 bg-white/15 mx-1 shrink-0" />
        <button onClick={() => setLineHeight(h => Math.max(1.4, +(h - 0.1).toFixed(2)))} className="px-1.5 py-1 rounded-lg hover:bg-white/10 text-[10px]" title="فاصله سطر کمتر">−سطر</button>
        <button onClick={() => setLineHeight(h => Math.min(2.4, +(h + 0.1).toFixed(2)))} className="px-1.5 py-1 rounded-lg hover:bg-white/10 text-[10px]" title="فاصله سطر بیشتر">+سطر</button>
        <span className="w-px h-4 bg-white/15 mx-1 shrink-0" />
        {(["narrow", "medium", "wide"] as Width[]).map(w => (
          <button key={w} onClick={() => setWidth(w)} className={`px-2 py-1 rounded-lg text-[10px] transition-colors ${width === w ? "bg-white/20 font-medium" : "opacity-65 hover:opacity-100"}`}>
            {w === "narrow" ? "باریک" : w === "medium" ? "متوسط" : "پهن"}
          </button>
        ))}
        <span className="w-px h-4 bg-white/15 mx-1 shrink-0" />
        <button onClick={() => setAlign(a => a === "justify" ? "right" : "justify")} className="p-1.5 rounded-lg hover:bg-white/10" title="ترازبندی">
          {align === "justify" ? <AlignJustify className="w-3.5 h-3.5" /> : <AlignLeft className="w-3.5 h-3.5" />}
        </button>
        <button onClick={speak} className={`p-1.5 rounded-lg transition-colors ${speaking ? "bg-emerald-500 text-white" : "hover:bg-white/10"}`} title="روخوانی صوتی">
          {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        {onToggleStar && (
          <button onClick={() => onToggleStar(article.id)} className={`p-1.5 rounded-lg hover:bg-white/10 ${article.starred ? "text-amber-400" : ""}`} title="ستاره‌دار">
            <Star className="w-3.5 h-3.5" fill={article.starred ? "currentColor" : "none"} />
          </button>
        )}
        {onToggleSave && (
          <button onClick={() => onToggleSave(article.id)} className={`p-1.5 rounded-lg hover:bg-white/10 ${isSaved ? "text-emerald-400" : ""}`} title="ذخیره">
            <Bookmark className="w-3.5 h-3.5" fill={isSaved ? "currentColor" : "none"} />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
