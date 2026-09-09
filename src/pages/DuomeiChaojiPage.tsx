import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import "../dalu.css";

export function DuomeiChaojiPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = "超级大陆 | 多美小记";
    return () => { document.title = previous; };
  }, []);
  return <Navigate to="/chaoji/map" replace />;
}
