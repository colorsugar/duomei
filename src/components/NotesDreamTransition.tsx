import type { DuomeiNote } from "../lib/noteTypes";
import { HomeIntroSection } from "./HomeIntroSection";
import { NotesCarousel } from "./NotesCarousel";
import { NotesIntro } from "./NotesIntro";
import "./NotesDreamTransition.css";

type NotesDreamTransitionProps = {
  canCreate: boolean;
  notes: DuomeiNote[];
  onCreate: () => void;
};

export function NotesDreamTransition({ canCreate, notes, onCreate }: NotesDreamTransitionProps) {
  return (
    <div className="notes-dream-transition">
      <section className="notes-dream-notes-panel" id="notes" aria-label="多美的小记">
        <div className="notes-dream-notes-content">
          <NotesIntro canCreate={canCreate} onCreate={onCreate} />
          <NotesCarousel notes={notes} />
        </div>
      </section>

      <div className="notes-dream-divider" aria-hidden="true">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path className="notes-dream-divider-fill" d="M0,52 C360,8 1080,8 1440,52 L1440,120 L0,120 Z" />
          <path className="notes-dream-divider-line" d="M0,52 C360,8 1080,8 1440,52" />
        </svg>
      </div>

      <section className="notes-dream-time-panel" aria-label="多美时光">
        <HomeIntroSection canCreate={canCreate} notes={notes} onCreate={onCreate} />
      </section>
    </div>
  );
}
