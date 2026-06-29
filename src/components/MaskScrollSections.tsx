import type { ReactNode } from "react";
import { useInlineEdit } from "./InlineEditProvider";

const tones = ["hero", "journey", "photo", "notes", "essays", "ai", "profile", "contact"];

export function MaskScrollSections({ children }: { children: ReactNode[] }) {
  const { editMode, drawerOpen } = useInlineEdit();

  return (
    <div className={`mask-scroll ${editMode || drawerOpen ? "is-disabled" : ""}`}>
      {children.map((child, index) => (
        <section className={`mask-panel mask-${tones[index] ?? "default"}`} key={index}>
          <div className="mask-panel-inner">{child}</div>
        </section>
      ))}
    </div>
  );
}
