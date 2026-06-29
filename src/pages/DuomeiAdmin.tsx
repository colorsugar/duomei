import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  createDraftNote,
  deleteNote,
  exportNotesJson,
  generateDefaultNotesSource,
  getAllNotes,
  importNotesJson,
  isAdminLoggedIn,
  loginAdmin,
  logoutAdmin,
  upsertNote,
} from "../lib/noteStore";

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
  const notes = useMemo(() => getAllNotes(), [version, notice, pendingDelete]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (mode === "login") {
    const submit = (event: FormEvent) => {
      event.preventDefault();
      if (loginAdmin(username, password)) {
        navigate("/admin/notes");
        return;
      }
      setError("用户名或密码不正确");
    };

    return (
      <main className="duomei-admin-login">
        <form onSubmit={submit}>
          <p>DUOMEI NOTES</p>
          <h1>多美小记管理后台</h1>
          <label>
            用户名
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
  const healthScore = Math.max(70, Math.min(98, 92 - drafts * 2 + Math.min(6, imageCount)));

  const refresh = () => setVersion((value) => value + 1);

  const createAndEdit = () => {
    const draft = createDraftNote();
    upsertNote(draft);
    navigate(`/note/${draft.slug}?edit=1`);
  };

  const backupNotes = () => {
    const json = exportNotesJson();
    setUtilityText(json);
    setImportText("");
    downloadText(`duomei-notes-backup-${Date.now()}.json`, json);
    setNotice("已下载备份 JSON。换电脑或发布前，建议先保留这份备份。");
  };

  const preparePublish = () => {
    const source = generateDefaultNotesSource();
    setUtilityText(source);
    setImportText("");
    downloadText("defaultNotes.ts", source);
    setNotice("已生成 defaultNotes.ts。静态 GitHub Pages 不能直接读取本机 localStorage，需要把这个文件提交到 GitHub 才会更新线上默认内容。");
  };

  const importJson = () => {
    try {
      importNotesJson(importText || utilityText);
      setNotice("已导入备份数据。");
      setImportText("");
      setUtilityText("");
      refresh();
    } catch {
      setNotice("JSON 格式不正确，导入失败。");
    }
  };

  const publishNote = (id: string) => {
    const note = notes.find((item) => item.id === id);
    if (!note) return;
    upsertNote({ ...note, status: "published", updatedAt: new Date().toISOString() });
    setNotice("已发布到当前浏览器。要同步到 GitHub Pages，请生成 defaultNotes.ts 并提交。");
    refresh();
  };

  const draftNote = (id: string) => {
    const note = notes.find((item) => item.id === id);
    if (!note) return;
    upsertNote({ ...note, status: "draft", updatedAt: new Date().toISOString() });
    setNotice("已转为草稿，首页不会显示这条小记。");
    refresh();
  };

  return (
    <main className="duomei-admin studio-admin">
      <aside>
        <strong>DUOMEI</strong>
        <span>多美小记工作室</span>
        <a href="/">查看网站</a>
        <a href="/#notes">小记列表</a>
        <button type="button" onClick={createAndEdit}>新增小记</button>
        <button
          type="button"
          onClick={() => {
            logoutAdmin();
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
          <div className="studio-status-pill"><span />本地已连接</div>
          <button type="button" onClick={preparePublish}>生成发布文件</button>
          <button type="button" onClick={backupNotes}>备份 JSON</button>
        </div>

        {notice ? (
          <div className="admin-notice">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")}>关闭</button>
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
              <span>本地数据正常。图片较多时，发布前请先备份 JSON。</span>
            </div>
          </article>
          <article className="studio-storage-card">
            <p>LocalStorage</p>
            <div>
              <strong>{formatBytes(bytes)}</strong>
              <span>约 {storagePercent}%</span>
            </div>
            <i><b style={{ width: `${storagePercent}%` }} /></i>
            <span>网页里的新增和编辑会先保存到这台电脑的浏览器。线上 GitHub Pages 需要提交发布文件后才会同步。</span>
          </article>
        </div>

        <div className="studio-publish-panel">
          <div>
            <p>发布同步</p>
            <h2>把本机内容同步到 GitHub Pages</h2>
            <span>
              浏览器不能安全地直接推送 GitHub。正确流程是：先在这里备份，再生成发布文件；之后由 Codex 或本机 Git 提交到仓库。
            </span>
          </div>
          <div className="studio-publish-actions">
            <button type="button" onClick={backupNotes}>1. 备份 JSON</button>
            <button type="button" onClick={preparePublish}>2. 生成 defaultNotes.ts</button>
            <a href="https://github.com/colorsugar/duomei/actions" target="_blank" rel="noreferrer">查看部署状态</a>
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
                  <span>{note.status === "published" ? "已发布" : "草稿"} / {note.date} / {note.location || "未填写地点"}</span>
                </div>
                <button type="button" onClick={() => navigate(`/note/${note.slug}?edit=1`)}>编辑</button>
                {note.status === "published" ? (
                  <button type="button" onClick={() => draftNote(note.id)}>转草稿</button>
                ) : (
                  <button type="button" onClick={() => publishNote(note.id)}>发布</button>
                )}
                <button type="button" onClick={() => setPendingDelete(note.id)}>删除</button>
              </article>
            ))}
          </div>
        </details>

        <div className="admin-utilities studio-utilities">
          <div>
            <strong>数据工具</strong>
            <p>导出备份、导入备份，或生成 GitHub Pages 发布用的默认数据。</p>
          </div>
          <div className="admin-utility-actions">
            <button type="button" onClick={backupNotes}>备份小记到 JSON</button>
            <button type="button" onClick={importJson}>从 JSON 恢复</button>
            <button type="button" onClick={preparePublish}>生成 defaultNotes.ts</button>
          </div>
          <textarea
            placeholder="这里会显示备份或发布数据；也可以粘贴备份 JSON 后点击恢复"
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
            <button
              type="button"
              onClick={() => {
                deleteNote(pendingDelete);
                setPendingDelete(null);
                setNotice("已删除。");
                refresh();
              }}
            >
              确认删除
            </button>
            <button type="button" onClick={() => setPendingDelete(null)}>取消</button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
