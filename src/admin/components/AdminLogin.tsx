import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../../lib/cmsStore";

export function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (loginAdmin(username, password)) {
      navigate("/admin");
      return;
    }
    setError("账号或密码不正确。");
  };

  return (
    <main className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <p className="eyebrow">TAMI CMS</p>
        <h1>Digital Archive Admin</h1>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="admin-error">{error}</p> : null}
        <button className="button primary" type="submit">
          Login
        </button>
      </form>
    </main>
  );
}
