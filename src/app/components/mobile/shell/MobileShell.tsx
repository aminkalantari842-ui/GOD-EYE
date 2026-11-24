import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MobileBottomNav, type MobileTab } from "./MobileBottomNav";
import { ToastProvider } from "../primitives/Toast";
import { OfflineBanner } from "../primitives/OfflineBanner";
import { TRANSITION_FAST } from "../../../motion/editorialMotion";

type Props = {
  /** Render-prop per tab so each screen owns its TopBar + body. */
  renderTab: (tab: MobileTab, setTab: (t: MobileTab) => void) => ReactNode;
  badges?: Partial<Record<MobileTab, number>>;
  /** Overlays (reader, sheets) rendered above tabs but below toasts. */
  overlays?: ReactNode;
  initialTab?: MobileTab;
};

/**
 * Top-level mobile container. Renders the active tab's content with smooth
 * compositor transitions and the shared BottomNav.
 */
export function MobileShell({ renderTab, badges, overlays, initialTab = "home" }: Props) {
  const [tab, setTab] = useState<MobileTab>(initialTab);
  return (
    <ToastProvider>
      <div dir="rtl" lang="fa" className="kian-mobile-theme md:hidden fixed inset-0 bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={TRANSITION_FAST}
            className="size-full"
          >
            {renderTab(tab, setTab)}
          </motion.div>
        </AnimatePresence>
        <OfflineBanner />
        <MobileBottomNav active={tab} onChange={setTab} badges={badges} />
        {overlays}
      </div>
    </ToastProvider>
  );
}
