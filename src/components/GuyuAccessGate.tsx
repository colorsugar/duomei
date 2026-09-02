import { useCallback, useEffect, useId, useState } from "react";
import type { FormEvent, PropsWithChildren } from "react";
import { Link } from "react-router-dom";

type AccessState = "checking" | "locked" | "submitting" | "unlocked" | "error";

export function GuyuAccessGate({ children }: PropsWithChildren) {
  const answerId = useId();
  const messageId = useId();
  const [state, setState] = useState<AccessState>("checking");
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");

  const checkAccess = useCallback(async () => {
    setState("checking");
    setMessage("");
    try {
      const response = await fetch("/api/guyu-auth", {
        method: "GET",
        credentials: "same-origin",
        headers: { "Accept": "application/json" },
      });
      const result = await response.json() as { authorized?: boolean };
      setState(response.ok && result.authorized ? "unlocked" : "locked");
    } catch {
      setState("error");
      setMessage("门暂时没开，请稍后再试。");
    }
  }, []);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  const submitAnswer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!answer.trim()) {
      setMessage("先写下班号。");
      return;
    }

    setState("submitting");
    setMessage("");
    try {
      const response = await fetch("/api/guyu-auth", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answer }),
      });
      const result = await response.json() as { authorized?: boolean; error?: string };
      if (response.ok && result.authorized) {
        setAnswer("");
        setState("unlocked");
        return;
      }
      setState("locked");
      setMessage(response.status === 401 ? "访问码不对，请重新输入。" : result.error || "没能打开，请再试一次。");
    } catch {
      setState("error");
      setMessage("门暂时没开，请稍后再试。");
    }
  };

  if (state === "unlocked") return children;

  return (
    <main className="guyu-gate-page">
      <section className="guyu-gate-card" aria-labelledby="guyu-gate-title" aria-busy={state === "checking" || state === "submitting"}>
        <p className="guyu-gate-mark">DUOMEI · 故语</p>
        <h1 id="guyu-gate-title">有些旧页，只认得旧同学。</h1>
        {state === "checking" ? (
          <p className="guyu-gate-status" role="status">正在辨认来访的人…</p>
        ) : state === "error" ? (
          <div className="guyu-gate-recovery">
            <p id={messageId} role="alert">{message}</p>
            <button type="button" onClick={() => void checkAccess()}>重新检查</button>
          </div>
        ) : (
          <form className="guyu-gate-form" onSubmit={submitAnswer}>
            <label htmlFor={answerId}>请输入故语访问码</label>
            <input
              id={answerId}
              type="password"
              data-guyu-access-code="10-digits"
              inputMode="numeric"
              autoComplete="off"
              maxLength={16}
              value={answer}
              aria-describedby={message ? messageId : undefined}
              aria-invalid={Boolean(message)}
              disabled={state === "submitting"}
              placeholder="10 位访问码"
              onChange={(event) => {
                setAnswer(event.currentTarget.value);
                if (message) setMessage("");
              }}
            />
            <p className="guyu-gate-hint">输入正确的访问码，旧册便会打开。</p>
            <button type="submit" disabled={state === "submitting"}>
              {state === "submitting" ? "正在辨认" : "翻开旧册"}
            </button>
            <p className="guyu-gate-message" id={messageId} role={message ? "alert" : undefined}>{message}</p>
          </form>
        )}
        <Link className="guyu-gate-home" to="/">返回首页</Link>
      </section>
    </main>
  );
}
