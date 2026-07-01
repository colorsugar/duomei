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
import { deleteCloudNote, getCloudSession, logoutCloudAdmin, saveCloudNote } from "../lib/supabaseNotes";
import { slugify } from "../lib/slugify";
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
    let active = true;
    const verifyCloudSession = async () => {
      if (!isAdminLoggedIn()) return;
      const session = await getCloudSession();
      if (!active) return;
      if (!session) {
        logoutAdmin();
        setIsLoggedIn(false);
        setEditMode(false);
      } else {
        setIsLoggedIn(true);
      }
    };
    verifyCloudSession();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    document.body.classList.toggle("front-editing", editMode);
    return () => document.body.classList.remove("front-editing");
  }, [editMode]);

  const value = useMemo<EditContext>(
    () => ({
      isLoggedIn,
      editMode,
      isEditorOpen: !!editingNote,
      refreshKey,
      toggleEditMode: () => setEditMode((value) => !value),
      logout: () => {
        logoutAdmin();
        setEditMode(false);
        void logoutCloudAdmin();
      },
      openNoteEditor: async (note) => {
        if (note) {
          setEditingNote(note);
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
      requestDelete: (id) => setPendingDelete(id),
    }),
    [editMode, editingNote, isLoggedIn, refreshKey, navigate],
  );

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
      // Local fallback remains available for offline drafts.
    }
    setEditingNote(null);
    refresh();
    if (isNew) navigate(`/note/${next.slug}`);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    deleteNote(pendingDelete);
    try {
      await deleteCloudNote(pendingDelete);
    } catch {
      // Keep local deletion even if cloud session expired.
    }
    setPendingDelete(null);
    refresh();
  };

  return (
    <Context.Provider value={value}>
      {children}
      <NoteEditDrawer note={editingNote} onClose={() => setEditingNote(null)} onSave={save} />
      {pendingDelete ? (
        <div className="duomei-delete-confirm">
          <span>确定删除这条小记吗？</span>
          <button type="button" onClick={confirmDelete}>
            确认删除
          </button>
          <button type="button" onClick={() => setPendingDelete(null)}>
            取消
          </button>
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
