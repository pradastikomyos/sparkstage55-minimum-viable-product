import styles from './AccountHeader.module.css';

type AccountHeaderMode = 'back-home' | 'menu';

type AccountHeaderProps = {
  mode: AccountHeaderMode;
  showLogo?: boolean;
  cartCount?: number;
  onSearchClick?: () => void;
  onMenuClick?: () => void;
};

export function AccountHeader({
  mode,
  showLogo = true,
  onSearchClick,
  onMenuClick,
}: AccountHeaderProps) {
  return (
    <header className={styles.header}>
      {mode === 'back-home' && (
        <a className={styles.backLink} href="/" aria-label="Kembali ke beranda">
          <svg className={styles.backIcon} viewBox="0 0 28 16" aria-hidden="true" focusable="false">
            <path d="M8 1 1 8l7 7" />
            <path d="M2 8h26" />
          </svg>
        </a>
      )}

      {mode === 'menu' && onMenuClick && (
        <button type="button" className={styles.menuButton} onClick={onMenuClick} aria-label="Buka menu">
          <span />
          <span />
          <span />
        </button>
      )}

      {showLogo && (
        <a href="/" className={styles.logoLink} aria-label="SparkStage - Beranda">
          <img
            src="/logo/logo black spark with tagline.png"
            alt="SparkStage"
            className={styles.logoImage}
          />
        </a>
      )}

      {onSearchClick && (
        <button type="button" className={styles.searchButton} onClick={onSearchClick}>
          CARI
        </button>
      )}
    </header>
  );
}
