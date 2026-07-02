type CompanionBubbleProps = {
  message: string;
  visible: boolean;
};

export function CompanionBubble({ message, visible }: CompanionBubbleProps) {
  return (
    <div className={`duomei-companion-note${visible ? " is-visible" : ""}`} aria-live="polite">
      {message}
    </div>
  );
}
