import { CSSProperties, FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { DuomeiNote } from "../lib/noteTypes";
import {
  createDraftNote,
  deleteNote,
  exportNotesJson,
  getAllNotes,
  importNotesJson,
  isAdminLoggedIn,
  loginAdmin,
  logoutAdmin,
  upsertNote,
} from "../lib/noteStore";
import {
  deleteCloudNote,
  fetchAllCloudNotes,
  getCloudSession,
  loginCloudAdmin,
  logoutCloudAdmin,
  saveCloudNote,
} from "../lib/supabaseNotes";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function localStorageBytes() {
  try {
    return new Blob([window.localStorage.getItem("duomei-notes-state") ?? ""]).size;
  } catch {
    return 0;
  }
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function DuomeiAdmin({ mode }: { mode: "login" | "notes" }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [utilityText, setUtilityText] = useState("");
  const [importText, setImportText] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [cloudReady, setCloudReady] = useState(false);
  const [notes, setNotes] = useState<DuomeiNote[]>(() => getAllNotes());

  const refresh = () => setVersion((value) => value + 1);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const session = await getCloudSession();
        const cloudNotes = await fetchAllCloudNotes();
        if (!active) return;
        setCloudReady(Boolean(session));
        setNotes(cloudNotes);
      } catch {
        if (!active) return;
        setCloudReady(false);
        setNotes(getAllNotes());
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [version]);

  if (mode === "login") {
    const submit = async (event: FormEvent) => {
      event.preventDefault();
      setError("");
      try {
        await loginCloudAdmin(username, password);
        loginAdmin("tami", "tamidesu");
        navigate("/admin/notes");
        return;
      } catch {
        logoutAdmin();
      }
      setError("邮箱或密码不正确。请使用 Supabase 管理员账号登录。");
    };

    return (
      <main className="duomei-admin-login">
        <form onSubmit={submit}>
          <p>DUOMEI NOTES</p>
          <h1>多美小记管理后台</h1>
          <label>
            邮箱 / 用户名
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            密码
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <p className="admin-notice is-danger">{error}</p> : null}
          <button type="submit">登录</button>
        </form>
      </main>
    );
  }

  if (!isAdminLoggedIn()) return <Navigate to="/admin/login" replace />;

  const published = notes.filter((note) => note.status === "published").length;
  const drafts = notes.length - published;
  const imageCount = notes.reduce((sum, note) => sum + (note.bodyImages?.length ?? 0) + (note.coverImageUrl ? 1 : 0), 0);
  const bytes = localStorageBytes();
  const storagePercent = Math.min(100, Math.round((bytes / (4.5 * 1024 * 1024)) * 100));
  const healthScore = Math.max(70, Math.min(98, 94 - drafts * 2 + Math.min(4, imageCount)));

  const createAndEdit = async () => {
    const draft = createDraftNote();
    upsertNote(draft);
    try {
      await saveCloudNote(draft);
    } catch {
      setNotice("云端暂时不可用，已先保存为本机草稿。");
    }
    navigate(`/note/${draft.slug}?edit=1`);
  };

  const backupNotes = () => {
    const json = JSON.stringify({ notes }, null, 2) || exportNotesJson();
    setUtilityText(json);
    setImportText("");
    downloadText(`duomei-notes-backup-${Date.now()}.json`, json);
    setNotice("已下载备份 JSON。");
  };

  const checkCloudPublish = async () => {
    try {
      const cloudNotes = await fetchAllCloudNotes();
      setUtilityText(JSON.stringify({ notes: cloudNotes }, null, 2));
      setImportText("");
      setCloudReady(true);
      setNotice("云端已连接：发布内容会直接写入 Supabase，不再需要 Git Push。");
    } catch {
      setNotice("云端连接失败，请检查 Supabase 登录状态或网络。");
    }
  };

  const importJson = () => {
    try {
      importNotesJson(importText || utilityText);
      setNotice("已导入备份数据到本机草稿。");
      setImportText("");
      setUtilityText("");
      refresh();
    } catch {
      setNotice("JSON 格式不正确，导入失败。");
    }
  };

  const setNoteStatus = async (note: DuomeiNote, status: DuomeiNote["status"]) => {
    const next = { ...note, status, updatedAt: new Date().toISOString() };
    upsertNote(next);
    try {
      await saveCloudNote(next);
      setNotice(status === "published" ? "已发布到云端，线上网站会立即显示。" : "已设为草稿，首页不会显示。");
    } catch {
      setNotice("云端更新失败，已先保存在本机。");
    }
    refresh();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    deleteNote(pendingDelete);
    try {
      await deleteCloudNote(pendingDelete);
      setNotice("已从云端隐藏这条小记。");
    } catch {
      setNotice("云端删除失败，已先从本机移除。");
    }
    setPendingDelete(null);
    refresh();
  };

  return (
    <main className="duomei-admin studio-admin">
      <aside>
        <strong>DUOMEI</strong>
        <span>多美小记工作室</span>
        <a href="/">查看网站</a>
        <a href="/#notes">小记列表</a>
        <button type="button" onClick={createAndEdit}>
          新增小记
        </button>
        <button
          type="button"
          onClick={() => {
            logoutAdmin();
            logoutCloudAdmin();
            navigate("/admin/login");
          }}
        >
          退出登录
        </button>
      </aside>

      <section>
        <div className="studio-admin-topbar">
          <div>
            <p>DUOMEI STUDIO</p>
            <h1>工作室</h1>
          </div>
          <div className="studio-status-pill">
            <span />
            {cloudReady ? "云端已连接" : "本地备用模式"}
          </div>
          <button type="button" onClick={checkCloudPublish}>
            检查云端发布
          </button>
          <button type="button" onClick={backupNotes}>
            备份 JSON
          </button>
        </div>

        {notice ? (
          <div className="admin-notice">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")}>
              关闭
            </button>
          </div>
        ) : null}

        <div className="studio-hero-panel">
          <p>多美，慢慢记录也没关系。</p>
          <h2>你的小记档案状态良好。</h2>
          <div>
            <span>{notes.length} 条小记</span>
            <span>{published} 已发布</span>
            <span>{drafts} 草稿</span>
            <span>{imageCount} 张图片</span>
          </div>
        </div>

        <div className="studio-status-grid">
          <article className="studio-health-card">
            <div className="studio-ring" style={{ "--score": healthScore } as CSSProperties}>
              <strong>{healthScore}</strong>
              <span>/100</span>
            </div>
            <div>
              <p>健康评分</p>
              <h3>{healthScore >= 90 ? "优秀" : "良好"}</h3>
              <span>正式数据来自 Supabase。本地只作为草稿和离线兜底。</span>
            </div>
          </article>
          <article className="studio-storage-card">
            <p>Local Draft Cache</p>
            <div>
              <strong>{formatBytes(bytes)}</strong>
              <span>约 {storagePercent}%</span>
            </div>
            <i>
              <b style={{ width: `${storagePercent}%` }} />
            </i>
            <span>LocalStorage 以后只用于草稿缓存，不再承担正式发布。</span>
          </article>
        </div>

        <div className="studio-publish-panel">
          <div>
            <p>发布同步</p>
            <h2>手机后台直接发布到 Supabase</h2>
            <span>上传图片、写小记、点击发布后，线上 Vercel 网站会读取同一份云端数据。</span>
          </div>
          <div className="studio-publish-actions">
            <button type="button" onClick={backupNotes}>
              备份 JSON
            </button>
            <button type="button" onClick={checkCloudPublish}>
              检查云端发布
            </button>
            <a href="https://github.com/colorsugar/duomei/actions" target="_blank" rel="noreferrer">
              GitHub Actions
            </a>
          </div>
        </div>

        <details className="studio-notes-panel" open={notesOpen} onToggle={(event) => setNotesOpen(event.currentTarget.open)}>
          <summary>
            <span>
              <strong>小记管理</strong>
              <em>{notes.length} 条内容，默认收起以保持后台干净</em>
            </span>
            <b>{notesOpen ? "收起" : "展开"}</b>
          </summary>
          <div className="admin-note-table studio-note-table">
            {notes.map((note) => (
              <article key={note.id}>
                <div>
                  <strong>{note.title}</strong>
                  <span>
                    {note.status === "published" ? "已发布" : "草稿"} / {note.date} / {note.location || "未填写地点"}
                  </span>
                </div>
                <button type="button" onClick={() => navigate(`/note/${note.slug}?edit=1`)}>
                  编辑
                </button>
                {note.status === "published" ? (
                  <button type="button" onClick={() => setNoteStatus(note, "draft")}>
                    设为草稿
                  </button>
                ) : (
                  <button type="button" onClick={() => setNoteStatus(note, "published")}>
                    发布
                  </button>
                )}
                <button type="button" onClick={() => setPendingDelete(note.id)}>
                  删除
                </button>
              </article>
            ))}
          </div>
        </details>

        <div className="admin-utilities studio-utilities">
          <div>
            <strong>数据工具</strong>
            <p>云端发布不再需要生成 defaultNotes.ts。这里保留 JSON 备份和恢复，用来防止误删。</p>
          </div>
          <div className="admin-utility-actions">
            <button type="button" onClick={backupNotes}>
              备份小记到 JSON
            </button>
            <button type="button" onClick={importJson}>
              从 JSON 恢复到本机草稿
            </button>
            <button type="button" onClick={checkCloudPublish}>
              检查云端
            </button>
          </div>
          <textarea
            placeholder="这里会显示备份数据；也可以粘贴备份 JSON 后点击恢复。"
            value={utilityText || importText}
            onChange={(event) => {
              setUtilityText("");
              setImportText(event.target.value);
            }}
          />
        </div>

        {pendingDelete ? (
          <div className="admin-delete-inline">
            <span>确定删除这条小记吗？</span>
            <button type="button" onClick={confirmDelete}>
              确认删除
            </button>
            <button type="button" onClick={() => setPendingDelete(null)}>
              取消
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
