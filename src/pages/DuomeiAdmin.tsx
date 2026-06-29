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
  const notes = useMemo(() => getAllNotes(), [notice, pendingDelete]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
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

  const createAndEdit = () => {
    const draft = createDraftNote();
    upsertNote(draft);
    navigate(`/note/${draft.slug}?edit=1`);
  };

  const backupNotes = () => {
    setUtilityText(exportNotesJson());
    setImportText("");
    setNotice("已生成备份 JSON。发布前建议先保存一份备份。");
  };

  const preparePublish = () => {
    setUtilityText(generateDefaultNotesSource());
    setImportText("");
    setNotice("已生成发布数据。部署前可用它更新 src/lib/defaultNotes.ts。");
  };

  const importJson = () => {
    try {
      importNotesJson(importText || utilityText);
      setNotice("已导入备份数据");
      setImportText("");
      setUtilityText("");
    } catch {
      setNotice("JSON 格式不正确，导入失败");
    }
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
          <button type="button" onClick={preparePublish}>生成发布数据</button>
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
              <span>本地数据正常。发布前请先备份，再生成发布数据。</span>
            </div>
          </article>
          <article className="studio-storage-card">
            <p>LocalStorage</p>
            <div>
              <strong>{formatBytes(bytes)}</strong>
              <span>约 {storagePercent}%</span>
            </div>
            <i><b style={{ width: `${storagePercent}%` }} /></i>
            <span>GitHub Pages 只会读取代码里的默认数据，不会自动读取这台电脑里的 localStorage。</span>
          </article>
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
                <button type="button" onClick={() => setPendingDelete(note.id)}>删除</button>
              </article>
            ))}
          </div>
        </details>

        <div className="studio-check-panel">
          <p>发布准备</p>
          <h2>GitHub Pages 发布前检查</h2>
          <ul>
            <li>先备份 JSON，避免本地浏览器数据丢失。</li>
            <li>再生成发布数据，用于更新默认内容文件。</li>
            <li>控制图片体积，过大 data URL 会让仓库变大。</li>
            <li>发布失败时先检查构建命令和 Pages 设置。</li>
          </ul>
        </div>

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
                setNotice("已删除");
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
