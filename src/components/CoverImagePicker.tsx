import { useState } from "react";
import { defaultCovers } from "../lib/defaultCovers";
import { compressImage } from "../lib/imageTools";

export function CoverImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string, message?: string) => void;
}) {
  const [message, setMessage] = useState("");

  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const result = await compressImage(file, "cover");
    const text = `封面已压缩：${Math.round(result.beforeBytes / 1024)}KB -> ${Math.round(result.afterBytes / 1024)}KB`;
    setMessage(text);
    onChange(result.dataUrl, text);
  };

  const chooseSystemCover = (src: string, label: string) => {
    const text = `已选择系统默认封面：${label}`;
    setMessage(text);
    onChange(src, text);
  };

  const useRandomCover = () => {
    const text = "已清空封面，将使用随机默认封面。";
    setMessage(text);
    onChange("", text);
  };

  return (
    <div className="cover-image-picker">
      <label>
        封面 URL
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://..." />
      </label>
      <div className="system-cover-picker" aria-label="系统默认封面">
        <div>
          <strong>系统默认封面</strong>
          <span>选择一张，或留空让小记自动随机显示。</span>
        </div>
        <div className="system-cover-grid">
          {defaultCovers.map((cover) => (
            <button
              className={value === cover.src ? "is-selected" : ""}
              type="button"
              key={cover.id}
              onClick={() => chooseSystemCover(cover.src, cover.label)}
              aria-label={`选择${cover.label}`}
            >
              <img src={cover.src} alt="" loading="lazy" />
              <span>{cover.label}</span>
            </button>
          ))}
        </div>
        {value ? (
          <button className="system-cover-clear" type="button" onClick={useRandomCover}>
            使用随机默认封面
          </button>
        ) : null}
      </div>
      <label>
        上传封面
        <input type="file" accept="image/*" onChange={(event) => upload(event.target.files)} />
      </label>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
