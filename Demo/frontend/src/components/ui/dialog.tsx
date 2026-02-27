import { type ReactNode, useEffect } from 'react';

import { cn } from '../../lib/utils';
import { Button } from './button';

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Dialog({ open, onOpenChange, title, description, children, footer }: DialogProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Fechar modal"
        className="absolute inset-0 bg-black/60"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          'relative z-10 w-[min(92vw,860px)] rounded-lg border bg-card text-card-foreground shadow-2xl',
          'max-h-[88vh] overflow-hidden',
        )}
      >
        <div className="border-b p-6">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="max-h-[58vh] overflow-auto p-6">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t p-4">
          {footer}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
