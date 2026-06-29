import { Link } from "react-router-dom";
import { useInlineEdit } from "./InlineEditProvider";

export function EditModeToolbar() {
  const { isLoggedIn, editMode, toggleEditMode, logout } = useInlineEdit();

  if (!isLoggedIn) {
    return (
      <div className="front-auth-actions">
        <Link className="front-pill" to="/admin/login">
          管理入口
        </Link>
      </div>
    );
  }

  return (
    <div className="front-auth-actions">
      <button className={editMode ? "front-pill is-on" : "front-pill"} type="button" onClick={toggleEditMode}>
        编辑模式：{editMode ? "开" : "关"}
      </button>
      <Link className="front-pill" to="/admin">
        进入后台
      </Link>
      <button className="front-pill" type="button" onClick={logout}>
        退出
      </button>
    </div>
  );
}
