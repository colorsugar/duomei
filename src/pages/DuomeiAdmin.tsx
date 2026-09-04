import { CSSProperties, FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { DuomeiNote } from "../lib/noteTypes";
import { guyuBooks } from "../content/guyuBooks";
import {
  createDraftNote,
  deleteNote,
  exportNotesJson,
  getAllNotes,
  importNotesJson,
  isAdminLoggedIn,
  markAdminLoggedIn,
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
import {
  ADMIN_DEPLOYMENT,
  ADMIN_SITE_SECTIONS,
  type AdminBuildMarker,
  channelLabel,
  computeAdminHealthScore,
  shortCommit,
  summarizeGuyuShelf,
} from "../lib/adminSiteInventory";
import { AnimatedButton, AnimatedCard, AnimatedParagraph, AnimatedTitle, RevealSection } from "../motion";

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
  const [buildMarker, setBuildMarker] = useState<AdminBuildMarker | null>(null);
  const [notes, setNotes] = useState<DuomeiNote[]>(() => getAllNotes());

  const refresh = () => setVersion((value) => value + 1);
  const guyuShelf = summarizeGuyuShelf(guyuBooks);

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

  useEffect(() => {
    let active = true;
    const loadBuild = async () => {
      try {
        const response = await fetch(`${ADMIN_DEPLOYMENT.buildMarkerPath}?admin=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("build marker missing");
        const payload = (await response.json()) as AdminBuildMarker;
        if (!active) return;
        setBuildMarker(payload);
      } catch {
        if (!active) return;
        setBuildMarker(null);
      }
    };
    loadBuild();
    return () => {
      active = false;
    };
  }, []);

  if (mode === "login") {
    const submit = async (event: FormEvent) => {
      event.preventDefault();
      setError("");
      try {
        await loginCloudAdmin(username, password);
        markAdminLoggedIn();
        navigate("/admin/notes");
      } catch {
        setError("邮箱或密码不正确。请使用 Supabase 管理员账号登录。");
      }
    };

    return (
      <RevealSection as="main" className="duomei-admin-login">
        <form onSubmit={submit}>
          <AnimatedParagraph>DUOMEI STUDIO</AnimatedParagraph>
          <AnimatedTitle as="h1">多美内容管理后台</AnimatedTitle>
          <label>
            邮箱
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="admin-notice is-danger">{error}</p> : null}
          <AnimatedButton type="submit">登录</AnimatedButton>
        </form>
      </RevealSection>
    );
  }

  if (!isAdminLoggedIn()) return <Navigate to="/admin/login" replace />;

  const published = notes.filter((note) => note.status === "published").length;
  const drafts = notes.length - published;
  const imageCount = notes.reduce(
    (sum, note) => sum + (note.bodyImages?.length ?? 0) + (note.coverImageUrl ? 1 : 0),
    0,
  );
  const bytes = localStorageBytes();
  const storagePercent = Math.min(100, Math.round((bytes / (4.5 * 1024 * 1024)) * 100));
  const healthScore = computeAdminHealthScore({
    draftCount: drafts,
    imageCount,
    cloudReady,
  });
  const buildLabel = buildMarker?.commit
    ? `${ADMIN_DEPLOYMENT.platformLabel} · ${shortCommit(buildMarker.commit)}`
    : `${ADMIN_DEPLOYMENT.platformLabel} · 正式站`;

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
      setNotice("云端已连接：小记写入 Supabase，图片走 Cloudflare R2；不需要为小记做 Git Push。");
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
        <span>多美内容工作室</span>
        <a href="/">首页</a>
        <a href="/#zaobao">早报</a>
        <a href="/#notes">小记</a>
        <a href="/#guyu">故语</a>
        <a href="/#yunyou">云游</a>
        <a href="/#weiyan">微言</a>
        <a href="#note-management">小记管理</a>
        <AnimatedButton type="button" onClick={createAndEdit}>
          新增小记
        </AnimatedButton>
        <AnimatedButton
          type="button"
          onClick={() => {
            logoutAdmin();
            logoutCloudAdmin();
            navigate("/admin/login");
          }}
        >
          退出登录
        </AnimatedButton>
      </aside>

      <RevealSection>
        <div className="studio-admin-topbar">
          <div>
            <AnimatedParagraph>DUOMEI STUDIO</AnimatedParagraph>
            <AnimatedTitle as="h1">工作室</AnimatedTitle>
          </div>
          <div className={`studio-status-pill${cloudReady ? "" : " is-local"}`}>
            <span />
            {cloudReady ? "云端已连接" : "本地备用模式"}
          </div>
          <div className="studio-deploy-pill" title={buildMarker?.commit ?? ADMIN_DEPLOYMENT.productionHost}>
            {buildLabel}
          </div>
          <AnimatedButton type="button" onClick={checkCloudPublish}>
            检查云端
          </AnimatedButton>
          <AnimatedButton type="button" onClick={backupNotes}>
            备份 JSON
          </AnimatedButton>
        </div>

        {notice ? (
          <div className="admin-notice">
            <span>{notice}</span>
            <AnimatedButton type="button" onClick={() => setNotice("")}>
              关闭
            </AnimatedButton>
          </div>
        ) : null}

        <AnimatedCard as="div" className="studio-hero-panel">
          <AnimatedParagraph>正式站在 EdgeOne；后台只管小记，其余板块看清发布通道。</AnimatedParagraph>
          <AnimatedTitle>按部署位置和内容归属整理后的工作室。</AnimatedTitle>
          <div>
            <span>{ADMIN_SITE_SECTIONS.length} 个站点板块</span>
            <span>{notes.length} 条小记</span>
            <span>{published} 已发布</span>
            <span>{drafts} 草稿</span>
            <span>{imageCount} 张图片</span>
            <span>
              故语 {guyuShelf.total} 册 · 公开 {guyuShelf.publicCount} / 班级 {guyuShelf.gatedCount}
            </span>
          </div>
        </AnimatedCard>

        <AnimatedCard as="div" className="studio-publish-panel">
          <div>
            <AnimatedParagraph>内容归属</AnimatedParagraph>
            <AnimatedTitle>只有小记在这个后台即时发布</AnimatedTitle>
            <span>
              小记走 {ADMIN_DEPLOYMENT.notesBackend} + {ADMIN_DEPLOYMENT.mediaBackend}。早报、快活、故语、云游、颜色、微言、技能随{" "}
              {ADMIN_DEPLOYMENT.releasePath} 上线，不在这里改正文。
            </span>
          </div>
          <div className="studio-section-map">
            {ADMIN_SITE_SECTIONS.map((section) => (
              <a key={section.id} className="studio-section-chip" href={section.href}>
                <strong>{section.label}</strong>
                <em>{channelLabel(section.channel)}</em>
                <span>{section.blurb}</span>
              </a>
            ))}
          </div>
        </AnimatedCard>

        <AnimatedCard as="div" className="studio-publish-panel">
          <div>
            <AnimatedParagraph>站点页面</AnimatedParagraph>
            <AnimatedTitle>按当前网站结构跳转核对</AnimatedTitle>
            <span>侧栏和这里都指向真实锚点：微言是 /#weiyan，快活是 /#kuaihuo，别再混成一个入口。</span>
          </div>
          <div className="studio-publish-actions">
            <AnimatedButton as="a" href="/">
              查看首页
            </AnimatedButton>
            <AnimatedButton as="a" href="/#weiyan">
              查看微言
            </AnimatedButton>
            <AnimatedButton as="a" href="/guyu">
              故语书架
            </AnimatedButton>
            <AnimatedButton as="a" href="/yunyou/">
              打开云游
            </AnimatedButton>
            <AnimatedButton as="a" href="#note-management">
              管理小记
            </AnimatedButton>
          </div>
        </AnimatedCard>

        <div className="studio-status-grid">
          <AnimatedCard className="studio-health-card">
            <div className="studio-ring" style={{ "--score": healthScore } as CSSProperties}>
              <strong>{healthScore}</strong>
              <span>/100</span>
            </div>
            <div>
              <AnimatedParagraph>健康评分</AnimatedParagraph>
              <AnimatedTitle as="h3">{healthScore >= 90 ? "优秀" : cloudReady ? "良好" : "待连云端"}</AnimatedTitle>
              <span>正式小记来自 Supabase。未连云端、草稿偏多，分数会降。本地只做草稿和离线兜底。</span>
            </div>
          </AnimatedCard>
          <AnimatedCard className="studio-storage-card">
            <AnimatedParagraph>Local Draft Cache</AnimatedParagraph>
            <div>
              <strong>{formatBytes(bytes)}</strong>
              <span>约 {storagePercent}%</span>
            </div>
            <i>
              <b style={{ width: `${storagePercent}%` }} />
            </i>
            <span>LocalStorage 只缓存小记草稿，正式发布与 EdgeOne 静态包无关。</span>
          </AnimatedCard>
        </div>

        <AnimatedCard as="div" className="studio-publish-panel">
          <div>
            <AnimatedParagraph>发布同步</AnimatedParagraph>
            <AnimatedTitle>小记上云，站点上 EdgeOne</AnimatedTitle>
            <span>
              上传图片、写小记、点击发布后，{ADMIN_DEPLOYMENT.productionHost} 立刻读 Supabase。早报 / 故语 / 云游等静态内容要等 GitHub
              合进 main，由 EdgeOne 工作流发布后才会变。
            </span>
          </div>
          <div className="studio-publish-actions">
            <AnimatedButton type="button" onClick={backupNotes}>
              备份 JSON
            </AnimatedButton>
            <AnimatedButton type="button" onClick={checkCloudPublish}>
              检查云端
            </AnimatedButton>
            <AnimatedButton as="a" href={ADMIN_DEPLOYMENT.actionsUrl} target="_blank" rel="noreferrer">
              GitHub Actions
            </AnimatedButton>
            <AnimatedButton as="a" href={ADMIN_DEPLOYMENT.productionHost} target="_blank" rel="noreferrer">
              打开正式站
            </AnimatedButton>
          </div>
        </AnimatedCard>

        <details
          id="note-management"
          className="studio-notes-panel"
          open={notesOpen}
          onToggle={(event) => setNotesOpen(event.currentTarget.open)}
        >
          <summary>
            <span>
              <strong>小记管理</strong>
              <em>{notes.length} 条内容，默认收起以保持后台干净</em>
            </span>
            <b>{notesOpen ? "收起" : "展开"}</b>
          </summary>
          <div className="admin-note-table studio-note-table">
            {notes.map((note) => (
              <AnimatedCard key={note.id}>
                <div>
                  <strong>{note.title}</strong>
                  <span>
                    {note.status === "published" ? "已发布" : "草稿"} / {note.date} / {note.location || "未填写地点"}
                  </span>
                </div>
                <AnimatedButton type="button" onClick={() => navigate(`/note/${note.slug}?edit=1`)}>
                  编辑
                </AnimatedButton>
                {note.status === "published" ? (
                  <AnimatedButton type="button" onClick={() => setNoteStatus(note, "draft")}>
                    设为草稿
                  </AnimatedButton>
                ) : (
                  <AnimatedButton type="button" onClick={() => setNoteStatus(note, "published")}>
                    发布
                  </AnimatedButton>
                )}
                <AnimatedButton type="button" onClick={() => setPendingDelete(note.id)}>
                  删除
                </AnimatedButton>
              </AnimatedCard>
            ))}
          </div>
        </details>

        <AnimatedCard as="div" className="admin-utilities studio-utilities">
          <div>
            <strong>数据工具</strong>
            <AnimatedParagraph>
              小记云端发布不再生成 defaultNotes.ts。JSON 备份只服务小记；故语页面和云游地图仍在仓库里，别指望从这里导出整站。
            </AnimatedParagraph>
          </div>
          <div className="admin-utility-actions">
            <AnimatedButton type="button" onClick={backupNotes}>
              备份小记到 JSON
            </AnimatedButton>
            <AnimatedButton type="button" onClick={importJson}>
              从 JSON 恢复到本机草稿
            </AnimatedButton>
            <AnimatedButton type="button" onClick={checkCloudPublish}>
              检查云端
            </AnimatedButton>
          </div>
          <textarea
            placeholder="这里会显示备份数据；也可以粘贴备份 JSON 后点击恢复。"
            value={utilityText || importText}
            onChange={(event) => {
              setUtilityText("");
              setImportText(event.target.value);
            }}
          />
        </AnimatedCard>

        {pendingDelete ? (
          <div className="admin-delete-inline">
            <span>确定删除这条小记吗？</span>
            <AnimatedButton type="button" onClick={confirmDelete}>
              确认删除
            </AnimatedButton>
            <AnimatedButton type="button" onClick={() => setPendingDelete(null)}>
              取消
            </AnimatedButton>
          </div>
        ) : null}
      </RevealSection>
    </main>
  );
}
