import { Link } from "react-router-dom";
import { useState } from "react";
import { useDuomeiEdit } from "./DuomeiEditProvider";

export function DuomeiHeader() {
  const { isLoggedIn, editMode, toggleEditMode, logout } = useDuomeiEdit();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const goHomeTop = () => {
    closeMenu();
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  const toggleEdit = () => {
    toggleEditMode();
    closeMenu();
  };

  const logoutAndClose = () => {
    logout();
    closeMenu();
  };

  return (
    <header className={`duomei-header${menuOpen ? " is-menu-open" : ""}`}>
      <Link className="duomei-brand" to="/" onClick={goHomeTop}>
        <strong>DUOMEI</strong>
        <span>多美小记</span>
      </Link>
      <button
        className="duomei-menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "关闭导航" : "打开导航"}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav>
        <Link to="/" onClick={goHomeTop}>首页</Link>
        <Link to="/#notes" onClick={closeMenu}>小记</Link>
        <Link to="/about" onClick={closeMenu}>关于</Link>
        {!isLoggedIn ? <Link to="/admin/login" onClick={closeMenu}>管理</Link> : null}
        {isLoggedIn ? (
          <>
            <button type="button" onClick={toggleEdit}>
              编辑：{editMode ? "开" : "关"}
            </button>
            <Link to="/admin/notes" onClick={closeMenu}>管理</Link>
            <button type="button" onClick={logoutAndClose}>退出</button>
          </>
        ) : null}
      </nav>
    </header>
  );
}
