import { useState } from "react";
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
    const text = `封面已压缩：${Math.round(result.beforeBytes / 1024)}KB → ${Math.round(result.afterBytes / 1024)}KB`;
    setMessage(text);
    onChange(result.dataUrl, text);
  };

  return (
    <div className="cover-image-picker">
      <label>
        封面 URL
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://..." />
      </label>
      <label>
        上传封面
        <input type="file" accept="image/*" onChange={(event) => upload(event.target.files)} />
      </label>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
