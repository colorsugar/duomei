import { Link } from "react-router-dom";
import { getHomeItems } from "../lib/cmsStore";
import { SectionHeading } from "./SectionHeading";

export function ClassicalNotes() {
  const notes = getHomeItems("note");

  return (
    <section className="section notes-section" id="notes">
      <SectionHeading
        eyebrow="Classical Notes"
        title="古文札记"
        intro="把古文当成慢慢读的旅记：山水、离别、归乡，还有看世界的方法。"
      />
      <div className="notes-grid">
        {notes.map((note) => (
          <Link className="note-card" key={note.id} data-reveal to={`/note/${note.slug}`}>
            <p className="note-quote">{note.subtitle}</p>
            <h3>{note.title}</h3>
            <p>{note.excerpt}</p>
            <div className="tag-row">
              {note.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
