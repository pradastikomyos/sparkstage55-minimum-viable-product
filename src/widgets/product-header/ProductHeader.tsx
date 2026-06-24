import type { ReactNode } from 'react';
import styles from './ProductHeader.module.css';

type ProductHeaderProps = {
  onBack: () => void;
  searchLink?: ReactNode;
  utilityGroup?: ReactNode;
};

export function ProductHeader({ onBack, searchLink, utilityGroup }: ProductHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.backBtn} onClick={onBack}>
          &#8592;
        </button>
      </div>
      <div className={styles.right}>
        {searchLink}
        {utilityGroup && <div className={styles.utilityGroup}>{utilityGroup}</div>}
      </div>
    </header>
  );
}
