import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export type AppleSpotlightItem = {
  id: string;
  icon: ReactNode;
  label: string;
  description?: string;
  onSelect: () => void;
};

type AppleSpotlightProps = {
  isOpen?: boolean;
  handleClose?: () => void;
  items: AppleSpotlightItem[];
};

export function AppleSpotlight({
  isOpen = true,
  handleClose = () => undefined,
  items,
}: AppleSpotlightProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
    if (!normalizedQuery) return items;
    return items.filter((item) =>
      `${item.label} ${item.description ?? ''}`.toLocaleLowerCase('id-ID').includes(normalizedQuery),
    );
  }, [items, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setActiveIndex(0);
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      window.clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('input, button:not([disabled])'),
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isOpen]);

  const selectItem = (index: number) => {
    const item = filteredItems[index];
    if (!item) return;
    item.onSelect();
  };

  const spotlight = (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="apple-spotlight-backdrop"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) handleClose();
          }}
        >
          <motion.div
            ref={panelRef}
            className="apple-spotlight"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi admin"
            initial={reduceMotion ? false : { opacity: 0, filter: 'blur(18px)', scaleX: 1.12, scaleY: 0.94, y: -12 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scaleX: 1, scaleY: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, filter: 'blur(18px)', scaleX: 1.08, scaleY: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 550, damping: 48 }}
          >
            <div className="apple-spotlight-input-wrap">
              <motion.svg layoutId="admin-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m16.25 16.25 4 4" />
              </motion.svg>
              <input
                ref={inputRef}
                type="search"
                aria-label="Cari menu admin"
                aria-controls="admin-spotlight-results"
                aria-activedescendant={filteredItems[activeIndex] ? `admin-spotlight-${filteredItems[activeIndex].id}` : undefined}
                placeholder="Cari menu admin..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActiveIndex((current) => Math.min(current + 1, Math.max(filteredItems.length - 1, 0)));
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActiveIndex((current) => Math.max(current - 1, 0));
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    selectItem(activeIndex);
                  }
                }}
              />
              <kbd>ESC</kbd>
            </div>

            <div className="apple-spotlight-results" id="admin-spotlight-results" role="listbox">
              {filteredItems.length ? filteredItems.map((item, index) => (
                <motion.button
                  id={`admin-spotlight-${item.id}`}
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  className={activeIndex === index ? 'is-active' : undefined}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : index * 0.025, duration: 0.16 }}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectItem(index)}
                >
                  <span className="apple-spotlight-item-icon">{item.icon}</span>
                  <span className="apple-spotlight-item-copy">
                    <strong>{item.label}</strong>
                    {item.description ? <small>{item.description}</small> : null}
                  </span>
                  <span className="apple-spotlight-arrow" aria-hidden="true">&rsaquo;</span>
                </motion.button>
              )) : (
                <p className="apple-spotlight-empty">Tidak ada menu yang cocok.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(spotlight, document.body);
}
