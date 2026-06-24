import styles from './MyOrdersTabs.module.css';

type MyOrdersTabsProps = {
  activeTab: 'pending' | 'active' | 'history';
  pendingCount: number;
  activeCount: number;
  historyCount: number;
  onChange: (tab: 'pending' | 'active' | 'history') => void;
};

export function MyOrdersTabs({ activeTab, pendingCount, activeCount, historyCount, onChange }: MyOrdersTabsProps) {
  const tabs = [
    { id: 'pending' as const, label: 'Menunggu Pembayaran', count: pendingCount },
    { id: 'active' as const, label: 'Siap Diambil', count: activeCount },
    { id: 'history' as const, label: 'Selesai', count: historyCount },
  ];

  return (
    <div className={styles.container}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`${styles.tab}${activeTab === tab.id ? ` ${styles.active}` : ''}`}
        >
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  );
}
