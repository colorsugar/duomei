import type { MouseEvent } from "react";
import type { ContentItem, ContentType } from "../lib/cmsTypes";
import { useInlineEdit } from "./InlineEditProvider";

type FrontContentActionsProps = {
  type: ContentType;
  item?: ContentItem;
  addLabel?: string;
  compact?: boolean;
};

export function FrontContentActions({ type, item, addLabel = "新增", compact = false }: FrontContentActionsProps) {
  const { isLoggedIn, editMode, openContentEditor, removeContent } = useInlineEdit();

  if (!isLoggedIn || !editMode) return null;

  const stop = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  if (!item) {
    return (
      <button className="front-edit-button" type="button" onClick={() => openContentEditor(type)}>
        {addLabel}
      </button>
    );
  }

  return (
    <div className={compact ? "card-edit-actions compact" : "card-edit-actions"}>
      <button type="button" onClick={(event) => { stop(event); openContentEditor(type, item); }}>
        编辑
      </button>
      <button className="danger" type="button" onClick={(event) => { stop(event); removeContent(item.id); }}>
        删除
      </button>
    </div>
  );
}
