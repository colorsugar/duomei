import type { ReactNode } from "react";
import { useInlineEdit } from "./InlineEditProvider";

type EditableBlockProps = {
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
};

export function EditableBlock({ children, className = "", actions }: EditableBlockProps) {
  const { isLoggedIn, editMode } = useInlineEdit();
  const active = isLoggedIn && editMode;

  return (
    <div className={`${className} ${active ? "editable-block" : ""}`}>
      {active && actions ? <div className="editable-actions">{actions}</div> : null}
      {children}
    </div>
  );
}
