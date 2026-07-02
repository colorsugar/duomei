import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { DuomeiNote } from "../lib/noteTypes";
import {
  NOTE_UPDATED_EVENT,
  createDraftNote,
  deleteNote,
  getAllNotes,
  isAdminLoggedIn,
  logoutAdmin,
  upsertNote,
} from "../lib/noteStore";
import { slugify } from "../lib/slugify";
import { deleteCloudNote, saveCloudNote } from "../lib/supabaseNotes";
import { NoteEditDrawer } from "./NoteEditDrawer";

type EditContext = {
  isLoggedIn: boolean;
  editMode: boolean;
  isEditorOpen: boolean;
  refreshKey: number;
  toggleEditMode: () => void;
  logout: () => void;
  openNoteEditor: (note?: DuomeiNote) => void;
  requestDelete: (id: string) => void;
};

const Context = createContext<EditContext | null>(null);

export function DuomeiEditProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => isAdminLoggedIn());
  const [editMode, setEditMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingNote, setEditingNote] = useState<DuomeiNote | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const refresh = () => {
    setIsLoggedIn(isAdminLoggedIn());
    setRefreshKey((value) => value + 1);
  };

  useEffect(() => {
    window.addEventListener(NOTE_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(NOTE_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("front-editing", editMode);
    return () => document.body.classList.remove("front-editing");
  }, [editMode]);

  const save = async (note: DuomeiNote) => {
    const isNew = !getAllNotes().some((item) => item.id === note.id);
    const next = {
      ...note,
      slug: note.slug.trim() || slugify(note.title, "note"),
      tags: note.tags.map((tag) => tag.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    };
    upsertNote(next);
    try {
      await saveCloudNote(next);
    } catch {
      // Detail editor handles full sync errors; front quick edit keeps local draft.
    }
    setEditingNote(null);
    refresh();
    if (isNew) navigate(`/note/${next.slug}?edit=1`);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteError("");
    try {
      await deleteCloudNote(pendingDelete);
      deleteNote(pendingDelete);
      setPendingDelete(null);
      refresh();
    } catch {
      setDeleteError("云端删除失败，请确认已经登录后再试。");
    }
  };

  const value = useMemo<EditContext>(
    () => ({
      isLoggedIn,
      editMode,
      isEditorOpen: !!editingNote,
      refreshKey,
      toggleEditMode: () => setEditMode((current) => !current),
      logout: () => {
        logoutAdmin();
        setEditMode(false);
        refresh();
      },
      openNoteEditor: async (note) => {
        if (note) {
          navigate(`/note/${note.slug}?edit=1`);
          return;
        }
        const draft = createDraftNote();
        upsertNote(draft);
        try {
          await saveCloudNote(draft);
        } catch {
          // Keep a local draft when the cloud session is unavailable.
        }
        refresh();
        navigate(`/note/${draft.slug}?edit=1`);
      },
      requestDelete: (id) => {
        setDeleteError("");
        setPendingDelete(id);
      },
    }),
    [editMode, editingNote, isLoggedIn, navigate, refreshKey],
  );

  return (
    <Context.Provider value={value}>
      {children}
      <NoteEditDrawer note={editingNote} onClose={() => setEditingNote(null)} onSave={save} />
      {pendingDelete ? (
        <div className="duomei-delete-confirm" role="dialog" aria-live="polite" aria-label="删除确认">
          <span>确定删除这条小记吗？</span>
          {deleteError ? <em>{deleteError}</em> : null}
          <div>
            <button type="button" className="danger" onClick={confirmDelete}>
              确认删除
            </button>
            <button type="button" onClick={() => setPendingDelete(null)}>
              取消
            </button>
          </div>
        </div>
      ) : null}
    </Context.Provider>
  );
}

export function useDuomeiEdit() {
  const context = useContext(Context);
  if (!context) throw new Error("useDuomeiEdit must be used inside DuomeiEditProvider");
  return context;
}
