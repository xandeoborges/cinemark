import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FiltersProvider } from '@/context/FiltersContext';
import { FilterBar } from '@/components/FilterBar';
import { HoursTab } from '@/pages/HoursTab';
import { DeliveriesTab } from '@/pages/DeliveriesTab';
import { ExecutionTimeTab } from '@/pages/ExecutionTimeTab';
import { ReworkTab } from '@/pages/ReworkTab';

const qc = new QueryClient();

type TabKey = 'hours' | 'deliveries' | 'executionTime' | 'rework';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'hours', label: 'Equipe & Horas' },
  { key: 'deliveries', label: 'Entregas & Produtividade' },
  { key: 'executionTime', label: 'Tempo de Execução' },
  { key: 'rework', label: 'Refações' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('hours');

  return (
    <QueryClientProvider client={qc}>
      <FiltersProvider>
        <div className="min-h-screen bg-background">
          <header className="border-b border-border px-6 py-4">
            <h1 className="text-lg font-semibold text-foreground">Cinemark — Dashboard</h1>
          </header>
          <FilterBar />
          <nav className="flex gap-2 border-b border-border px-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm ${
                  activeTab === tab.key
                    ? 'border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <main className="p-6">
            {activeTab === 'hours' && <HoursTab />}
            {activeTab === 'deliveries' && <DeliveriesTab />}
            {activeTab === 'executionTime' && <ExecutionTimeTab />}
            {activeTab === 'rework' && <ReworkTab />}
          </main>
        </div>
      </FiltersProvider>
    </QueryClientProvider>
  );
}
