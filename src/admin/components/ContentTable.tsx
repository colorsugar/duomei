import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ContentType } from "../../lib/cmsTypes";
import { deleteItem, getAllItems } from "../../lib/cmsStore";

const config: Record<ContentType, { title: string; path: string; newLabel: string }> = {
  journey: { title: "旅程", path: "journeys", newLabel: "新增旅程" },
  photo: { title: "摄影", path: "photos", newLabel: "新增摄影" },
  note: { title: "古文札记", path: "notes", newLabel: "新增古文" },
  essay: { title: "文章", path: "essays", newLabel: "新增文章" },
  "ai-wall": { title: "AI留言墙", path: "ai-wall", newLabel: "新增留言" },
};

export function ContentTable({ type }: { type: ContentType }) {
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const rows = getAllItems().filter((item) => item.type === type);
  const meta = config[type];

  const remove = (id: string) => {
    deleteItem(id);
    navigate(0);
  };

  return (
    <div className="admin-panel">
      <div className="admin-title-row">
        <div>
          <p className="eyebrow">内容管理</p>
          <h1>{meta.title}</h1>
        </div>
        <Link className="button primary" to={`/admin/${meta.path}/new`}>
          {meta.newLabel}
        </Link>
      </div>
      {pendingDelete ? (
        <div className="delete-confirm">
          <span>确定删除这条内容吗？</span>
          <button type="button" onClick={() => remove(pendingDelete)}>
            确认删除
          </button>
          <button type="button" onClick={() => setPendingDelete(null)}>
            取消
          </button>
        </div>
      ) : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>状态</th>
              <th>日期</th>
              <th>分类</th>
              <th>首页显示</th>
              <th>重点展示</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.status === "published" ? "已发布" : "草稿"}</td>
                <td>{item.date}</td>
                <td>{item.category}</td>
                <td>{item.showOnHome ? "是" : "否"}</td>
                <td>{item.featured ? "是" : "否"}</td>
                <td>{new Date(item.updatedAt).toLocaleString()}</td>
                <td>
                  <Link to={`/admin/${meta.path}/${item.id}`}>编辑</Link>
                  <button type="button" onClick={() => setPendingDelete(item.id)}>
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
