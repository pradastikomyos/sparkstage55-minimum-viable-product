import { useEffect, useState, useMemo } from 'react';
import { menuData } from '../../data/navigation';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animationClass, setAnimationClass] = useState('');

  const collections = useMemo(() => {
    return Object.values(menuData)
      .flat()
      .filter(section => section.header !== 'HIGHLIGHTS')
      .flatMap(section => section.links)
      .filter((link, index, self) => link.href && self.findIndex(l => l.text === link.text) === index);
  }, []);

  const highlights = useMemo(() => {
    return Object.values(menuData)
      .flat()
      .filter(section => section.header === 'HIGHLIGHTS')
      .flatMap(section => section.links)
      .filter((link, index, self) => link.href && self.findIndex(l => l.text === link.text) === index);
  }, []);

  const searchResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return [...collections, ...highlights]
      .filter((link, index, self) =>
        link.href &&
        link.text.toLowerCase().includes(normalizedQuery) &&
        self.findIndex((candidate) => candidate.text === link.text) === index,
      );
  }, [collections, highlights, query]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setAnimationClass('is-opening');
      document.body.style.overflow = 'hidden';
      setQuery('');
    } else if (shouldRender) {
      setAnimationClass('is-closing');
      const timer = setTimeout(() => {
        setShouldRender(false);
        setAnimationClass('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  // ESC close + focus trap
  useEffect(() => {
    if (!isOpen) return;
    const overlay = document.querySelector('.search-overlay');
    if (!overlay) return;

    const focusableSelector = 'input, button, [href], [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(overlay.querySelectorAll<HTMLElement>(focusableSelector));

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstEl) {
          event.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          event.preventDefault();
          firstEl.focus();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div className={`search-overlay-container ${animationClass}`}>
      <div className="search-overlay-scrim" onClick={onClose} />
      <div className="search-overlay">
        <div className="search-overlay-top">
          <input 
            type="text" 
            placeholder="Search" 
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button className="search-close-btn" onClick={onClose}>
            CLOSE
          </button>
        </div>
        <div className={`search-overlay-body ${query ? 'has-query' : ''}`}>
          <div className="search-column search-column-left">
            <h3 className="search-column-title">COLLECTIONS</h3>
            <ul className="search-links">
              {collections.map((link, i) => (
                <li 
                  key={`col-${i}`} 
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <a href={link.href}>{link.text}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="search-column search-column-right">
            {query ? (
              searchResults.length > 0 ? (
                <>
                  <h3 className="search-column-title">HASIL PENCARIAN</h3>
                  <ul className="search-links">
                    {searchResults.map((link, i) => (
                      <li key={`result-${link.text}-${i}`} style={{ animationDelay: `${i * 0.05}s` }}>
                        <a href={link.href}>{link.text}</a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="search-no-results" style={{ animation: 'fadeIn 0.4s ease forwards' }}>
                  <p>Tidak ada hasil untuk "{query}"</p>
                  <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>Coba kata kunci lain atau jelajahi koleksi kami.</p>
                </div>
              )
            ) : (
              <>
                <h3 className="search-column-title">HIGHLIGHTS</h3>
                <ul className="search-links">
                  {highlights.map((link, i) => (
                    <li 
                      key={`high-${i}`}
                      style={{ animationDelay: `${(i + 4) * 0.05}s` }}
                    >
                      <a href={link.href}>{link.text}</a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
