import type { ReactNode } from 'react';

interface DataStateProps {
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  children: ReactNode;
}

export function DataState({ isLoading, error, onRetry, children }: DataStateProps) {
  if (isLoading) {
    return <p className="px-6 py-8 text-muted-foreground">Carregando dados...</p>;
  }
  if (error) {
    return (
      <div className="px-6 py-8 text-destructive">
        <p>Não foi possível carregar os dados: {error.message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  return <>{children}</>;
}
