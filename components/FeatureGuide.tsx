import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react';

export type GuideStep = {
  target: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom';
  padding?: number;
  radius?: number;
};

type RectState = {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
};

interface FeatureGuideProps {
  steps: GuideStep[];
  onDone: () => void;
  onSkip?: () => void;
}

const DEFAULT_PADDING = 6;

const clamp = (value: number, min: number, max: number) => {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};

const FeatureGuide: React.FC<FeatureGuideProps> = ({ steps, onDone, onSkip }) => {
  const maskId = React.useId();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [targetRect, setTargetRect] = React.useState<RectState | null>(null);

  const activeStep = steps[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === steps.length - 1;

  const saveGuideAsDone = React.useCallback(() => {
    try {
      localStorage.setItem('hasSeenHomeGuide_v1', 'true');
    } catch {
      // Ignore localStorage errors.
    }
  }, []);

  const finishGuide = React.useCallback(() => {
    saveGuideAsDone();
    onDone();
  }, [onDone, saveGuideAsDone]);

  const skipGuide = React.useCallback(() => {
    saveGuideAsDone();
    onSkip?.();
    onDone();
  }, [onDone, onSkip, saveGuideAsDone]);

  const updateTargetRect = React.useCallback(() => {
    if (!activeStep) return;

    const el = document.querySelector<HTMLElement>(
      `[data-guide="${activeStep.target}"]`
    );

    if (!el) {
      setTargetRect(null);
      return;
    }

    el.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });

    window.setTimeout(() => {
      const latestRect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);

      const padding = activeStep.padding ?? DEFAULT_PADDING;
      const elementRadius = parseFloat(computedStyle.borderRadius || '0');

      setTargetRect({
        top: Math.max(0, latestRect.top - padding),
        left: Math.max(0, latestRect.left - padding),
        width: latestRect.width + padding * 2,
        height: latestRect.height + padding * 2,
        radius: activeStep.radius ?? elementRadius + padding,
      });
    }, 220);
  }, [activeStep]);

  React.useEffect(() => {
    const timeout = window.setTimeout(updateTargetRect, 80);

    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [updateTargetRect]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        skipGuide();
      }

      if (event.key === 'ArrowRight') {
        setActiveIndex((prev) => Math.min(prev + 1, steps.length - 1));
      }

      if (event.key === 'ArrowLeft') {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [skipGuide, steps.length]);

  if (!activeStep || steps.length === 0) return null;

  const viewportWidth =
    typeof window !== 'undefined' ? window.innerWidth : 390;

  const viewportHeight =
    typeof window !== 'undefined' ? window.innerHeight : 844;

  const tooltipWidth = Math.min(360, viewportWidth - 32);
  const tooltipHeightEstimate = 245;

  const rawTooltipTop =
    targetRect && activeStep.placement === 'top'
      ? targetRect.top - tooltipHeightEstimate - 18
      : targetRect
        ? targetRect.top + targetRect.height + 18
        : viewportHeight / 2 - tooltipHeightEstimate / 2;

  const rawTooltipLeft = targetRect
    ? targetRect.left + targetRect.width / 2 - tooltipWidth / 2
    : viewportWidth / 2 - tooltipWidth / 2;

  const safeTooltipTop = clamp(
    rawTooltipTop,
    16,
    viewportHeight - tooltipHeightEstimate - 16
  );

  const safeTooltipLeft = clamp(
    rawTooltipLeft,
    16,
    viewportWidth - tooltipWidth - 16
  );

  const progress = ((activeIndex + 1) / steps.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {targetRect ? (
          <>
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <mask id={maskId}>
                  <rect width="100%" height="100%" fill="white" />

                  <motion.rect
                    fill="black"
                    initial={false}
                    animate={{
                      x: targetRect.left,
                      y: targetRect.top,
                      width: targetRect.width,
                      height: targetRect.height,
                      rx: targetRect.radius,
                      ry: targetRect.radius,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 280,
                      damping: 30,
                    }}
                  />
                </mask>
              </defs>

              <rect
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.78)"
                mask={`url(#${maskId})`}
              />
            </svg>

            <motion.div
              className="absolute pointer-events-none border-2 border-brand-400"
              style={{
                borderRadius: targetRect.radius,
                boxShadow:
                  '0 0 0 6px rgba(51,173,174,0.16), 0 0 36px rgba(51,173,174,0.72)',
              }}
              initial={false}
              animate={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height,
                scale: [1, 1.025, 1],
              }}
              transition={{
                top: { type: 'spring', stiffness: 280, damping: 30 },
                left: { type: 'spring', stiffness: 280, damping: 30 },
                width: { type: 'spring', stiffness: 280, damping: 30 },
                height: { type: 'spring', stiffness: 280, damping: 30 },
                scale: {
                  repeat: Infinity,
                  duration: 1.8,
                  ease: 'easeInOut',
                },
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-black/75" />
        )}

        <motion.div
          key={activeStep.target}
          className="absolute rounded-[26px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5"
          style={{
            top: safeTooltipTop,
            left: safeTooltipLeft,
            width: tooltipWidth,
          }}
          initial={{ y: 16, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <button
            type="button"
            onClick={skipGuide}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors active:scale-95"
            aria-label="Tutup guide"
          >
            <X size={16} />
          </button>

          <div className="pr-10">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-500 mb-2">
              Guide {activeIndex + 1} / {steps.length}
            </p>

            <h2 className="text-xl font-black text-zinc-950 dark:text-white leading-tight">
              {activeStep.title}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {activeStep.description}
            </p>
          </div>

          <div className="mt-5 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <motion.div
              className="h-full bg-brand-500 rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            />
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => setActiveIndex((prev) => Math.max(prev - 1, 0))}
              className="h-11 px-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={finishGuide}
                className="h-11 px-5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-brand-500/25 active:scale-95 transition-all"
              >
                Done
                <CheckCircle2 size={17} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((prev) => Math.min(prev + 1, steps.length - 1))
                }
                className="h-11 px-5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-brand-500/25 active:scale-95 transition-all"
              >
                Next
                <ChevronRight size={17} />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FeatureGuide;
