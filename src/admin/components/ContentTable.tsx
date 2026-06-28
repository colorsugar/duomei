import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ContentType } from "../../lib/cmsTypes";
import { deleteItem, getAllItems } from "../../lib/cmsStore";

const config: Record<ContentType, { title: string; path: string; newLabel: string }> = {
  journey: { title: "Journeys", path: "journeys", newLabel: "New Journey" },
  photo: { title: "Photography", path: "photos", newLabel: "New Photo" },
  note: { title: "Classical Notes", path: "notes", newLabel: "New Note" },
  essay: { title: "Essays", path: "essays", newLabel: "New Essay" },
  "ai-wall": { title: "AI Wall", path: "ai-wall", newLabel: "New AI Wall Message" },
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
          <p className="eyebrow">Content</p>
          <h1>{meta.title}</h1>
        </div>
        <Link className="button primary" to={`/admin/${meta.path}/new`}>
          {meta.newLabel}
        </Link>
      </div>
      {pendingDelete ? (
        <div className="delete-confirm">
          <span>确认删除这条内容吗？</span>
          <button type="button" onClick={() => remove(pendingDelete)}>
            Confirm delete
          </button>
          <button type="button" onClick={() => setPendingDelete(null)}>
            Cancel
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
              <th>首页</th>
              <th>Featured</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.status}</td>
                <td>{item.date}</td>
                <td>{item.category}</td>
                <td>{item.showOnHome ? "Yes" : "No"}</td>
                <td>{item.featured ? "Yes" : "No"}</td>
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
