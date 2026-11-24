import {
  Search, Rss, FileText, Star, Circle, Settings, Plus, TrendingUp, Bookmark,
  Tag, FileUp, ChevronDown, ChevronLeft, RefreshCw, AlertTriangle, Trash2,
  Network, Globe2, BarChart3, Sunrise, Command, Sparkles, Filter, Brain,
  NotebookPen, Clock, Pin, X, Wand2, Radar, Package, MonitorDot, Crosshair,
  Workflow, Columns3, PanelRightClose, PanelRightOpen, HelpCircle, Languages, CopyMinus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ThemeToggle } from "./ThemeToggle";
import { type Topic, topicColorClasses } from "../topics";
import {
  useAutoTranslateTitles, getAutoTranslate, setAutoTranslate,
  useDedupeArticles, getDedupe, setDedupe,
} from "../translationCache";
import { SPRING_SNAPPY, TRANSITION_FAST } from "../motion/editorialMotion";

export type SidebarFeed = { id: string; name: string; count: number; icon: string; category: string };
export type PinnedTopic = { topic: Topic; count: number; active: boolean };

type Props = {
  activeView: string;
  setActiveView: (v: string) => void;
  selectedFeed: string | null;
  setSelectedFeed: (id: string | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (c: string | null) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  feeds: SidebarFeed[];
  onAddFeed: () => void;
  onRefresh: () => void;
  loading: boolean;
  totals: { all: number; unread: number; starred: number; saved: number };
  search: string;
  setSearch: (s: string) => void;
  lastRefresh: Date | null;
  feedStatus?: Record<string, { ok: boolean; error?: string }>;
  onOpenOpml?: () => void;
  onRemoveFeed?: (id: string) => void;
  onPruneFeeds?: () => void;
  pruning?: boolean;
  onOpenStats?: () => void;
  onOpenDigest?: () => void;
  onOpenPalette?: () => void;
  onOpenSourceHub?: () => void;
  onOpenSavedSearches?: () => void;
  onOpenKnowledge?: () => void;
  onOpenNotes?: () => void;
  onOpenTimeline?: () => void;
  onOpenStudio?: () => void;
  onOpenVisualFlow?: () => void;
  pinnedTopics?: PinnedTopic[];
  onToggleTopic?: (id: string) => void;
  onClearTopics?: () => void;
  onAddTopic?: () => void;
  socialUnread?: number;
  watchUnread?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  activeWorkspaceTab?: "reader" | "editorial" | "visual_flow" | "graph";
};

export function Sidebar({
  activeView, setActiveView, selectedFeed, setSelectedFeed,
  selectedCategory = null, setSelectedCategory = () => {},
  theme, onToggleTheme, feeds, onAddFeed, onRefresh, loading,
  totals = { all: 0, unread: 0, starred: 0, saved: 0 },
  search = "", setSearch = () => {}, lastRefresh = null,
  feedStatus = {}, onOpenOpml = () => {}, onRemoveFeed, onPruneFeeds, pruning = false, onOpenHelp, onOpenRules,
  onOpenStats, onOpenDigest, onOpenPalette, onOpenSourceHub, onOpenSavedSearches, onOpenKnowledge, onOpenNotes, onOpenTimeline, onOpenStudio, onOpenVisualFlow,
  pinnedTopics = [], onToggleTopic, onClearTopics, onAddTopic, socialUnread = 0, watchUnread = 0,
  collapsed: controlledCollapsed, onToggleCollapse, activeWorkspaceTab,
}: Props & { onOpenHelp?: () => void; onOpenRules?: () => void }) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed ?? internalCollapsed;
  const handleToggleCollapse = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setInternalCollapsed(v => !v);
  };
  const [feedsOpen, setFeedsOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const autoTranslate = useAutoTranslateTitles();
  const dedupe = useDedupeArticles();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const navGroups = [
    {
      id: 'reading',
      label: 'خواندن',
      icon: FileText,
      items: [
        { id: 'all', label: 'همه مقالات', icon: FileText, count: totals.all },
        { id: 'unread', label: 'خوانده نشده', icon: Circle, count: totals.unread },
        { id: 'starred', label: 'نشان شده‌ها', icon: Star, count: totals.starred },
        { id: 'saved', label: 'ذخیره شده‌ها', icon: Bookmark, count: totals.saved },
      ],
    },
    {
      id: 'discover',
      label: 'کشف و رصد',
      icon: Radar,
      items: [
        { id: 'trending', label: 'پرطرفدارها', icon: TrendingUp, count: null },
        { id: 'tags', label: 'برچسب‌ها', icon: Tag, count: null },
        { id: 'international', label: 'اخبار بین‌الملل', icon: Globe2, count: null },
        { id: 'graph', label: 'نقشهٔ رسانه‌ای', icon: Network, count: null },
        { id: 'room', label: 'اتاق رصد رسانه‌ای', icon: MonitorDot, count: null },
        { id: 'social', label: 'رصد اجتماعی', icon: Radar, count: null, badge: socialUnread || null },
        { id: 'watch', label: 'رصد تغییرات صفحه', icon: Crosshair, count: null, badge: watchUnread || null },
      ],
    },
    {
      id: 'tools',
      label: 'ابزارهای تحلیلی',
      icon: Wand2,
      items: [
        { id: 'visual-flow', label: 'بوم بصری اتوماسیون', icon: Workflow, count: null, action: onOpenVisualFlow || onOpenStudio },
        { id: 'studio', label: 'استودیوی محتوا (۳ستونه)', icon: Columns3, count: null, action: onOpenStudio },
        { id: 'newspack', label: 'بسته‌های خبری سفارشی', icon: Package, count: null },
        { id: 'digest', label: 'گزارش روزانه', icon: Sunrise, count: null, action: onOpenDigest },
        { id: 'stats', label: 'داشبورد آمار', icon: BarChart3, count: null, action: onOpenStats },
        { id: 'source-hub', label: 'منبع‌یاب چندپلتفرمی', icon: Sparkles, count: null, action: onOpenSourceHub },
        { id: 'saved-searches', label: 'فیلترهای ذخیره‌شده', icon: Filter, count: null, action: onOpenSavedSearches },
        { id: 'knowledge', label: 'موتور دانش', icon: Brain, count: null, action: onOpenKnowledge },
        { id: 'notes', label: 'یادداشت‌ها', icon: NotebookPen, count: null, action: onOpenNotes },
        { id: 'timeline', label: 'خط زمانی موضوع', icon: Clock, count: null, action: onOpenTimeline },
      ],
    },
  ];

  const grouped = useMemo(() => {
    const m = new Map<string, SidebarFeed[]>();
    for (const f of feeds) {
      const k = f.category || 'سایر';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(f);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [feeds]);

  const toggleCat = (name: string) => {
    const next = new Set(expandedCats);
    next.has(name) ? next.delete(name) : next.add(name);
    setExpandedCats(next);
  };

  return (
    <aside
      data-testid="app-sidebar"
      data-collapsed={isCollapsed ? "true" : "false"}
      className={`${
        isCollapsed ? "w-[68px]" : "w-[276px] max-w-[85vw]"
      } shrink-0 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] border-l border-[var(--sidebar-border)] flex flex-col h-full transition-[width] duration-200 ease-[var(--ease-out-expo)] overflow-x-hidden select-none`}
    >
      {/* Top Brand & Search Header */}
      <div className={`${isCollapsed ? "p-2.5 space-y-2.5 flex flex-col items-center" : "px-4 pt-4 pb-3.5"} border-b border-[var(--sidebar-border)]`}>
        {isCollapsed ? (
          <>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleCollapse}
              data-testid="sidebar-collapse-toggle"
              aria-expanded={false}
              aria-label="باز کردن نوار کناری"
              title="باز کردن نوار کناری"
              className="size-9 grid place-items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--card)] hover:bg-[var(--background-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <PanelRightOpen className="w-4 h-4" />
            </motion.button>
            <div
              title="کیان (FLOW)"
              className="size-9 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center text-sm font-bold shadow-[var(--shadow-xs)]"
            >
              ک
            </div>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <button
              type="button"
              onClick={() => handleToggleCollapse()}
              aria-label="جستجو در مقالات"
              title="جستجو در مقالات"
              className="size-9 grid place-items-center rounded-[var(--radius-md)] hover:bg-[var(--background-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
            {onOpenPalette && (
              <button
                type="button"
                onClick={onOpenPalette}
                aria-label="پنل دستورات"
                title="پنل دستورات (Ctrl K)"
                className="size-9 grid place-items-center rounded-[var(--radius-md)] hover:bg-[var(--background-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <Command className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-display text-[21px] font-bold tracking-tight text-[var(--foreground)]">کیان</span>
                <span className="text-[11px] font-mono tracking-wider text-[var(--foreground-subtle)]">FLOW</span>
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(o => !o)}
                    aria-label="تنظیمات"
                    title="تنظیمات"
                    className={`size-8 grid place-items-center rounded-[var(--radius-md)] border transition-colors cursor-pointer ${
                      settingsOpen
                        ? "bg-[var(--background-muted)] border-[var(--border)] text-[var(--foreground)]"
                        : "bg-[var(--card)] border-[var(--border-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]"
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {settingsOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.98 }}
                          transition={TRANSITION_FAST}
                          className="absolute left-0 top-full mt-2 z-50 w-72 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--popover)] text-[var(--popover-foreground)] shadow-[var(--shadow-xl)] p-3"
                          dir="rtl"
                        >
                          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[var(--border-subtle)]">
                            <span className="text-xs font-semibold text-[var(--foreground)]">تنظیمات خوانش</span>
                            <button
                              type="button"
                              onClick={() => setSettingsOpen(false)}
                              aria-label="بستن تنظیمات"
                              className="p-1 rounded hover:bg-[var(--background-muted)] text-[var(--foreground-subtle)]"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setAutoTranslate(!getAutoTranslate())}
                              className="w-full flex items-center gap-3 p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-subtle)] text-right transition-colors cursor-pointer"
                            >
                              <span className="shrink-0 size-8 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-foreground)] grid place-items-center">
                                <Languages className="w-4 h-4" />
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-xs font-semibold text-[var(--foreground)]">ترجمهٔ خودکار تیترها</span>
                                <span className="block text-[11px] text-[var(--foreground-subtle)] leading-tight mt-0.5">برگردان خودکار تیترهای غیرفارسی</span>
                              </span>
                              <span className={`shrink-0 w-9 h-5 rounded-full transition-colors relative ${autoTranslate ? "bg-[var(--brand-500)]" : "bg-[var(--border-strong)]"}`}>
                                <span className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-150 ${autoTranslate ? "-translate-x-4" : ""}`} />
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDedupe(!getDedupe())}
                              className="w-full flex items-center gap-3 p-2 rounded-[var(--radius-md)] hover:bg-[var(--background-subtle)] text-right transition-colors cursor-pointer"
                            >
                              <span className="shrink-0 size-8 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-foreground)] grid place-items-center">
                                <CopyMinus className="w-4 h-4" />
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-xs font-semibold text-[var(--foreground)]">ادغام اخبار تکراری</span>
                                <span className="block text-[11px] text-[var(--foreground-subtle)] leading-tight mt-0.5">حذف تیترهای مشابه بین خبرگزاری‌ها</span>
                              </span>
                              <span className={`shrink-0 w-9 h-5 rounded-full transition-colors relative ${dedupe ? "bg-[var(--brand-500)]" : "bg-[var(--border-strong)]"}`}>
                                <span className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-150 ${dedupe ? "-translate-x-4" : ""}`} />
                              </span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={handleToggleCollapse}
                  data-testid="sidebar-collapse-toggle"
                  aria-expanded={true}
                  aria-label="جمع کردن نوار کناری"
                  title="جمع کردن نوار کناری"
                  className="hidden md:grid size-8 place-items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--card)] hover:bg-[var(--background-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  <PanelRightClose className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="relative group">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--foreground-subtle)] group-focus-within:text-[var(--brand-500)] transition-colors pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                type="text"
                data-search-input
                aria-label="جستجو در مقالات"
                placeholder="جستجوی معنایی مقالات…"
                className="w-full bg-[var(--card)] border border-[var(--border-subtle)] hover:border-[var(--border)] focus:border-[var(--brand-500)] rounded-[var(--radius-md)] py-1.5 pr-8 pl-8 text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="پاک کردن جستجو"
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--foreground-subtle)] hover:text-[var(--foreground)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--foreground-subtle)] bg-[var(--background-subtle)] border border-[var(--border-subtle)] rounded px-1.5 py-0.2">
                  /
                </kbd>
              )}
            </div>

            {onOpenPalette && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={onOpenPalette}
                className="mt-2 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--card)]/70 hover:bg-[var(--card)] border border-[var(--border-subtle)] hover:border-[var(--border)] text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <Command className="w-3.5 h-3.5 text-[var(--brand-600)] dark:text-[var(--brand-400)]" />
                <span className="flex-1 text-right">فرمان‌ها و پرش سریع</span>
                <kbd className="text-[10px] font-mono text-[var(--foreground-subtle)] bg-[var(--background-subtle)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5">
                  ⌘K
                </kbd>
              </motion.button>
            )}
          </>
        )}
      </div>

      {/* Scrollable Navigation Body */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isCollapsed ? "p-2 space-y-2" : "px-2.5 py-3"}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-1.5 pb-2 border-b border-[var(--sidebar-border)]">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => onOpenStudio?.()}
              data-testid="sidebar-open-studio-workspace"
              aria-label="میز کار تحریریه"
              title="میز کار تحریریه"
              className={`size-10 grid place-items-center rounded-[var(--radius-md)] transition-colors cursor-pointer ${
                activeWorkspaceTab === "editorial"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-xs)]"
                  : "bg-[var(--card)] border border-[var(--border-subtle)] text-[var(--foreground)] hover:bg-[var(--background-muted)]"
              }`}
            >
              <Columns3 className="w-4 h-4" />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => (onOpenVisualFlow ? onOpenVisualFlow() : onOpenStudio?.())}
              data-testid="sidebar-open-visual-flow"
              aria-label="بوم بصری اتوماسیون"
              title="بوم بصری اتوماسیون"
              className={`size-10 grid place-items-center rounded-[var(--radius-md)] transition-colors cursor-pointer ${
                activeWorkspaceTab === "visual_flow"
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)] border border-[var(--brand-400)]"
                  : "bg-[var(--card)] border border-[var(--border-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]"
              }`}
            >
              <Workflow className="w-4 h-4" />
            </motion.button>
          </div>
        ) : (
          <div className="mb-3.5 grid grid-cols-2 gap-1.5">
            <motion.button
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={SPRING_SNAPPY}
              onClick={() => onOpenStudio?.()}
              data-testid="sidebar-open-studio-workspace"
              className={`flex flex-col items-start gap-1.5 p-2.5 rounded-[var(--radius-md)] border text-right transition-colors cursor-pointer ${
                activeWorkspaceTab === "editorial"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent shadow-[var(--shadow-sm)]"
                  : "bg-[var(--card)] hover:bg-[var(--background-muted)] text-[var(--foreground)] border-[var(--border-subtle)]"
              }`}
            >
              <Columns3 className={`w-4 h-4 ${activeWorkspaceTab === "editorial" ? "text-[var(--primary-foreground)]" : "text-[var(--brand-600)] dark:text-[var(--brand-400)]"}`} />
              <div className="min-w-0 w-full">
                <div className="text-xs font-semibold truncate">میز تحریریه</div>
                <div className={`text-[10px] truncate ${activeWorkspaceTab === "editorial" ? "opacity-80" : "text-[var(--foreground-subtle)]"}`}>۸ پلتفرم نشر</div>
              </div>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={SPRING_SNAPPY}
              onClick={() => (onOpenVisualFlow ? onOpenVisualFlow() : onOpenStudio?.())}
              data-testid="sidebar-open-visual-flow"
              className={`flex flex-col items-start gap-1.5 p-2.5 rounded-[var(--radius-md)] border text-right transition-colors cursor-pointer ${
                activeWorkspaceTab === "visual_flow"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent shadow-[var(--shadow-sm)]"
                  : "bg-[var(--card)] hover:bg-[var(--background-muted)] text-[var(--foreground)] border-[var(--border-subtle)]"
              }`}
            >
              <Workflow className={`w-4 h-4 ${activeWorkspaceTab === "visual_flow" ? "text-[var(--primary-foreground)]" : "text-[var(--brand-600)] dark:text-[var(--brand-400)]"}`} />
              <div className="min-w-0 w-full">
                <div className="text-xs font-semibold truncate">بوم اتوماسیون</div>
                <div className={`text-[10px] truncate ${activeWorkspaceTab === "visual_flow" ? "opacity-80" : "text-[var(--foreground-subtle)]"}`}>جریان هوشمند</div>
              </div>
            </motion.button>
          </div>
        )}

        <nav className={isCollapsed ? "flex flex-col items-center gap-1" : "mb-4 space-y-3"} aria-label="ناوبری اصلی">
          {navGroups.map((group, gIdx) => {
            const collapsed = collapsedGroups.has(group.id);
            const groupBadge = group.items.reduce((s, it) => s + (Number((it as any).badge) || 0), 0);

            if (isCollapsed) {
              return (
                <div
                  key={group.id}
                  className={`w-full flex flex-col items-center gap-1 ${
                    gIdx > 0 ? "pt-2 mt-1 border-t border-[var(--sidebar-border)]" : ""
                  }`}
                >
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const active =
                      (item.id === "studio" && activeWorkspaceTab === "editorial") ||
                      (item.id === "visual-flow" && activeWorkspaceTab === "visual_flow") ||
                      (item.id === "graph" && activeWorkspaceTab === "graph") ||
                      ((!activeWorkspaceTab || activeWorkspaceTab === "reader") && activeView === item.id);
                    const badge = (item as any).badge;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={item.count !== null && item.count !== undefined ? `${item.label} (${item.count})` : item.label}
                        aria-label={item.label}
                        aria-current={active ? "page" : undefined}
                        onClick={() => {
                          if ((item as any).action) { (item as any).action(); return; }
                          setActiveView(item.id); setSelectedFeed(null); setSelectedCategory(null);
                        }}
                        className={`relative size-10 grid place-items-center rounded-[var(--radius-md)] transition-colors cursor-pointer ${
                          active
                            ? "text-[var(--accent-foreground)] font-semibold"
                            : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-collapsed-pill"
                            transition={SPRING_SNAPPY}
                            className="absolute inset-0 rounded-[var(--radius-md)] bg-[var(--accent)] -z-0"
                          />
                        )}
                        <Icon className="w-4 h-4 relative z-10" />
                        {badge ? (
                          <span className="absolute top-1.5 left-1.5 size-2 rounded-full bg-rose-500 z-10" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={group.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!collapsed}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[var(--foreground-subtle)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  <motion.span
                    animate={{ rotate: collapsed ? 90 : 0 }}
                    transition={TRANSITION_FAST}
                    className="grid place-items-center"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </motion.span>
                  <span className="flex-1 text-right text-[11px] font-semibold">{group.label}</span>
                  {collapsed && groupBadge > 0 && (
                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                      {groupBadge.toLocaleString("fa-IR")}
                    </span>
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={TRANSITION_FAST}
                      className="space-y-0.5 mt-0.5"
                    >
                      {group.items.map(item => {
                        const Icon = item.icon;
                        const active =
                          (item.id === "studio" && activeWorkspaceTab === "editorial") ||
                          (item.id === "visual-flow" && activeWorkspaceTab === "visual_flow") ||
                          (item.id === "graph" && activeWorkspaceTab === "graph") ||
                          ((!activeWorkspaceTab || activeWorkspaceTab === "reader") && activeView === item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            aria-current={active ? "page" : undefined}
                            onClick={() => {
                              if ((item as any).action) { (item as any).action(); return; }
                              setActiveView(item.id); setSelectedFeed(null); setSelectedCategory(null);
                            }}
                            className={`relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-md)] text-right transition-colors cursor-pointer ${
                              active
                                ? "text-[var(--foreground)] font-semibold"
                                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)]/70"
                            }`}
                          >
                            {active && (
                              <motion.span
                                layoutId="sidebar-nav-pill"
                                transition={SPRING_SNAPPY}
                                className="absolute inset-0 rounded-[var(--radius-md)] bg-[var(--card)] border border-[var(--border-subtle)] shadow-[var(--shadow-xs)]"
                              />
                            )}
                            {active && (
                              <motion.span
                                layoutId="sidebar-nav-edge"
                                transition={SPRING_SNAPPY}
                                className="absolute right-0 top-1.5 bottom-1.5 w-[3px] rounded-l-full bg-[var(--brand-500)]"
                              />
                            )}
                            <Icon className={`w-4 h-4 shrink-0 relative z-10 ${active ? "text-[var(--brand-600)] dark:text-[var(--brand-400)]" : ""}`} />
                            <span className="flex-1 text-[13px] truncate relative z-10">{item.label}</span>
                            {item.count !== null && item.count !== undefined && (
                              <span className="text-[11px] tabular-nums text-[var(--foreground-subtle)] relative z-10">
                                {item.count.toLocaleString("fa-IR")}
                              </span>
                            )}
                            {(item as any).badge ? (
                              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 tabular-nums relative z-10">
                                {(item as any).badge.toLocaleString("fa-IR")}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Pinned Topics */}
        {!isCollapsed && pinnedTopics.length > 0 && (
          <div className="mb-4 pt-3 border-t border-[var(--sidebar-border)]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-[var(--foreground-subtle)] text-[11px] font-semibold">
              <Pin className="w-3 h-3" />
              <span className="flex-1 text-right">موضوعات سنجاق‌شده</span>
              {pinnedTopics.some(p => p.active) && onClearTopics && (
                <button type="button" onClick={onClearTopics} title="پاک کردن همه" aria-label="پاک کردن موضوعات" className="p-0.5 hover:bg-[var(--sidebar-accent)] rounded">
                  <X className="w-3 h-3" />
                </button>
              )}
              {onAddTopic && (
                <button type="button" onClick={onAddTopic} title="موضوع سفارشی" aria-label="افزودن موضوع سفارشی" className="p-0.5 hover:bg-[var(--sidebar-accent)] rounded">
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="space-y-0.5 mt-1">
              {pinnedTopics.map(({ topic, count, active }) => {
                const cls = topicColorClasses(topic.color);
                return (
                  <button
                    type="button"
                    key={topic.id}
                    onClick={() => onToggleTopic?.(topic.id)}
                    disabled={count === 0 && !active}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-md)] text-right text-xs transition cursor-pointer ${
                      active
                        ? `${cls.chip} ring-1 ${cls.ring}`
                        : count === 0
                          ? "opacity-45 cursor-not-allowed"
                          : "hover:bg-[var(--sidebar-accent)]"
                    }`}
                  >
                    <span>{topic.icon}</span>
                    <span className="flex-1 truncate">{topic.name}</span>
                    <span className="text-[11px] tabular-nums opacity-75">
                      {count.toLocaleString("fa-IR")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories & Feeds */}
        {isCollapsed ? (
          <div className="pt-2 mt-2 border-t border-[var(--sidebar-border)] flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={handleToggleCollapse}
              title={`همه خوراک‌ها (${feeds.length})`}
              aria-label="نمایش دسته‌بندی‌ها و خوراک‌ها"
              className="size-10 grid place-items-center rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
            >
              <Rss className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onRefresh}
              title="بروزرسانی خوراک‌ها"
              aria-label="بروزرسانی خوراک‌ها"
              className="size-10 grid place-items-center rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onAddFeed}
              title="افزودن خوراک"
              aria-label="افزودن خوراک"
              className="size-10 grid place-items-center rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="pt-3 border-t border-[var(--sidebar-border)] space-y-3">
            <div>
              <button
                type="button"
                onClick={() => setCatsOpen(!catsOpen)}
                aria-expanded={catsOpen}
                className="w-full flex items-center gap-1.5 px-2.5 py-1 text-[var(--foreground-subtle)] hover:text-[var(--foreground)] text-[11px] font-semibold rounded-[var(--radius-sm)] transition-colors cursor-pointer"
              >
                {catsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                <span className="flex-1 text-right">دسته‌بندی‌ها</span>
                <span className="tabular-nums">{grouped.length.toLocaleString("fa-IR")}</span>
              </button>
              <AnimatePresence initial={false}>
                {catsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={TRANSITION_FAST}
                    className="space-y-0.5 mt-1"
                  >
                    {grouped.map(([cat, list]) => {
                      const unread = list.reduce((s, f) => s + f.count, 0);
                      const expanded = expandedCats.has(cat);
                      const catActive = selectedCategory === cat && activeView === 'category';
                      return (
                        <div key={cat}>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => toggleCat(cat)}
                              aria-label={`باز کردن دسته ${cat}`}
                              className="p-1 text-[var(--foreground-subtle)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] rounded"
                            >
                              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setActiveView('category'); setSelectedCategory(cat); setSelectedFeed(null); }}
                              className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-md)] text-right text-[13px] transition-colors cursor-pointer ${
                                catActive
                                  ? 'bg-[var(--card)] text-[var(--foreground)] font-semibold border border-[var(--border-subtle)] shadow-[var(--shadow-xs)]'
                                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)]'
                              }`}
                            >
                              <span className="flex-1 truncate">{cat}</span>
                              <span className="text-[11px] tabular-nums text-[var(--foreground-subtle)]">
                                {(unread > 0 ? unread : list.length).toLocaleString("fa-IR")}
                              </span>
                            </button>
                          </div>
                          {expanded && (
                            <div className="mr-5 pr-2 border-r border-[var(--sidebar-border)] space-y-0.5 mt-0.5">
                              {list.map(feed => {
                                const st = feedStatus[feed.id];
                                const broken = st && st.ok === false;
                                return (
                                  <div key={feed.id} className="group flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => { setSelectedFeed(feed.id); setActiveView('feed'); setSelectedCategory(null); }}
                                      className={`flex-1 flex items-center gap-2 px-2 py-1 rounded-[var(--radius-sm)] text-right text-xs transition-colors cursor-pointer ${
                                        selectedFeed === feed.id
                                          ? 'bg-[var(--card)] text-[var(--foreground)] font-semibold'
                                          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)]'
                                      }`}
                                    >
                                      <span>{feed.icon}</span>
                                      <span className={`flex-1 truncate ${broken ? 'text-rose-500' : ''}`}>{feed.name}</span>
                                      {broken && <AlertTriangle className="w-3 h-3 text-rose-500" title={st.error || 'خطا در دریافت'} />}
                                      {feed.count > 0 && <span className="tabular-nums text-[11px] text-[var(--foreground-subtle)]">{feed.count.toLocaleString("fa-IR")}</span>}
                                    </button>
                                    {onRemoveFeed && (
                                      <button
                                        type="button"
                                        onClick={() => onRemoveFeed(feed.id)}
                                        aria-label={`حذف ${feed.name}`}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--foreground-subtle)] hover:text-rose-500 transition-opacity"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setFeedsOpen(!feedsOpen)}
                  aria-expanded={feedsOpen}
                  className="flex-1 flex items-center gap-1.5 px-2.5 py-1 text-[var(--foreground-subtle)] hover:text-[var(--foreground)] text-[11px] font-semibold rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                >
                  {feedsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                  <Rss className="w-3 h-3" />
                  <span className="flex-1 text-right">همه منابع</span>
                  <span className="tabular-nums">{feeds.length.toLocaleString("fa-IR")}</span>
                </button>
                <button type="button" onClick={onRefresh} aria-label="بروزرسانی خوراک‌ها" className="p-1.5 text-[var(--foreground-subtle)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] rounded-[var(--radius-sm)] transition-colors cursor-pointer" title="بروزرسانی">
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
                {onPruneFeeds && (
                  <button
                    type="button"
                    onClick={onPruneFeeds}
                    disabled={pruning}
                    aria-label="بررسی سلامت منابع"
                    className="p-1.5 text-[var(--foreground-subtle)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] rounded-[var(--radius-sm)] disabled:opacity-50 transition-colors cursor-pointer"
                    title="بررسی سلامت و حذف خوراک‌های خراب"
                  >
                    <Wand2 className={`w-3 h-3 ${pruning ? 'animate-spin text-[var(--brand-500)]' : ''}`} />
                  </button>
                )}
                <button type="button" onClick={onAddFeed} aria-label="افزودن منبع جدید" className="p-1.5 text-[var(--foreground-subtle)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] rounded-[var(--radius-sm)] transition-colors cursor-pointer" title="افزودن خوراک">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <AnimatePresence initial={false}>
                {feedsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={TRANSITION_FAST}
                    className="space-y-0.5 mt-1 max-h-60 overflow-y-auto"
                  >
                    {feeds.length === 0 && (
                      <div className="px-3 py-2 text-xs text-[var(--foreground-subtle)]">هنوز خوراکی اضافه نشده</div>
                    )}
                    {feeds.slice(0, 100).map(feed => {
                      const st = feedStatus[feed.id];
                      const broken = st && st.ok === false;
                      return (
                        <div key={feed.id} className="group flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => { setSelectedFeed(feed.id); setActiveView('feed'); setSelectedCategory(null); }}
                            className={`flex-1 flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-md)] text-right text-xs transition-colors cursor-pointer ${
                              selectedFeed === feed.id
                                ? 'bg-[var(--card)] text-[var(--foreground)] font-semibold border border-[var(--border-subtle)]'
                                : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)]'
                            }`}
                          >
                            <span>{feed.icon}</span>
                            <span className={`flex-1 truncate ${broken ? 'text-rose-500' : ''}`}>{feed.name}</span>
                            {broken && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" title={st.error || 'خطا'} />}
                            {feed.count > 0 && <span className="text-[11px] tabular-nums text-[var(--foreground-subtle)]">{feed.count.toLocaleString("fa-IR")}</span>}
                          </button>
                          {onRemoveFeed && (
                            <button
                              type="button"
                              onClick={() => onRemoveFeed(feed.id)}
                              aria-label={`حذف ${feed.name}`}
                              className="opacity-0 group-hover:opacity-100 p-1 text-[var(--foreground-subtle)] hover:text-rose-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {feeds.length > 100 && (
                      <div className="px-3 py-1 text-[11px] text-[var(--foreground-subtle)] tabular-nums">
                        و {(feeds.length - 100).toLocaleString("fa-IR")} منبع دیگر…
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Footer Utility Strip */}
      <div className={`${isCollapsed ? "p-2 flex flex-col items-center gap-1" : "px-3 py-2.5"} border-t border-[var(--sidebar-border)]`}>
        {isCollapsed ? (
          <>
            <button
              type="button"
              onClick={onOpenOpml}
              title="ورود و خروج OPML"
              aria-label="OPML"
              className="size-9 grid place-items-center rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
            </button>
            {onOpenRules && (
              <button
                type="button"
                onClick={onOpenRules}
                title="قوانین برچسب خودکار"
                aria-label="قوانین"
                className="size-9 grid place-items-center rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
              >
                <Tag className="w-4 h-4" />
              </button>
            )}
            {onOpenHelp && (
              <button
                type="button"
                onClick={onOpenHelp}
                title="میان‌برها (?)"
                aria-label="میان‌برها"
                className="size-9 grid place-items-center rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenOpml}
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--card)] hover:bg-[var(--background-muted)] border border-[var(--border-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileUp className="w-3 h-3" /> OPML
              </button>
              {onOpenRules && (
                <button
                  type="button"
                  onClick={onOpenRules}
                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--card)] hover:bg-[var(--background-muted)] border border-[var(--border-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer whitespace-nowrap"
                  title="قوانین برچسب خودکار"
                >
                  <Tag className="w-3 h-3" /> قوانین
                </button>
              )}
              {onOpenHelp && (
                <button
                  type="button"
                  onClick={onOpenHelp}
                  aria-label="میان‌برهای صفحه‌کلید"
                  className="size-7 grid place-items-center text-xs rounded-[var(--radius-sm)] bg-[var(--card)] hover:bg-[var(--background-muted)] border border-[var(--border-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  title="میان‌برها (?)"
                >
                  ؟
                </button>
              )}
            </div>
            {lastRefresh && (
              <span className="text-[10px] text-[var(--foreground-subtle)] tabular-nums truncate">
                {lastRefresh.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
