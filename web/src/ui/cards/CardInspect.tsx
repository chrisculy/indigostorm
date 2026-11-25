import type { ReactNode } from 'react';
import { Dialog } from '../components/Dialog.tsx';

export interface CardInspectProps {
  open: boolean;
  onClose: () => void;
  /** Dialog title (the card's name). */
  title: string;
  /** The card to show, rendered at size="xl" (long text is never clamped at xl). */
  children: ReactNode;
  /** Full text transcript shown beside the card (e.g. from playerCardSummary / threatCardSummary). */
  text?: ReactNode;
  /** Optional actions (e.g. "Tuck here", "Play for ability"). */
  actions?: ReactNode;
}

/** Large zoom view of any card in a modal dialog, with an optional text transcript and actions. */
export function CardInspect({ open, onClose, title, children, text, actions }: CardInspectProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} size="lg" footer={actions} className="inspect">
      <div className="inspect__layout">
        <div className="inspect__card">{children}</div>
        {text && <div className="inspect__text">{text}</div>}
      </div>
    </Dialog>
  );
}
