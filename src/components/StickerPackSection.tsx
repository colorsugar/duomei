import { useState } from "react";

const stickerPacks = [
  {
    index: "01",
    name: "多美",
    previewSrc: "/images/stickers/duomei-preview.jpg",
    previewWidth: 837,
    qrSrc: "/images/stickers/duomei-qr.jpg",
    installUrl: "https://w.url.cn/s/ANJIS6e#wechat_redirect",
    downloadName: "duomei-wechat-qr.jpg",
  },
  {
    index: "02",
    name: "多美猪猪",
    previewSrc: "/images/stickers/duomei-zhu-zhu-preview.jpg",
    previewWidth: 838,
    qrSrc: "/images/stickers/duomei-zhu-zhu-qr.jpg",
    installUrl: "https://w.url.cn/s/A5vPMKw#wechat_redirect",
    downloadName: "duomei-zhu-zhu-wechat-qr.jpg",
  },
] as const;

async function copyText(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through for browsers that expose Clipboard but block the write.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.append(textarea);

  let copied = false;
  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    copied = document.execCommand("copy");
  } finally {
    textarea.remove();
  }

  if (!copied) throw new Error("copy failed");
}

export function StickerPackSection() {
  const [copyStatus, setCopyStatus] = useState<{ name: string; copied: boolean } | null>(null);

  const handleCopy = async (name: string, installUrl: string) => {
    try {
      await copyText(installUrl);
      setCopyStatus({ name, copied: true });
    } catch {
      setCopyStatus({ name, copied: false });
    }
  };

  return (
    <section className="sticker-pack-section" id="color" aria-labelledby="sticker-pack-title">
      <header className="sticker-pack-heading">
        <h2 id="sticker-pack-title">颜色</h2>
        <p>两套微信表情，留住多美不同的样子。</p>
      </header>

      <ol className="sticker-pack-list" aria-label="微信表情包">
        {stickerPacks.map((pack) => (
          <li key={pack.name}>
            <article className="sticker-pack-card">
              <span className="sticker-pack-number" aria-hidden="true">{pack.index} / 02</span>
              <figure className="sticker-pack-preview">
                <img
                  src={pack.previewSrc}
                  width={pack.previewWidth}
                  height="1280"
                  alt={`${pack.name}微信表情包预览`}
                  loading="lazy"
                  decoding="async"
                />
              </figure>

              <div className="sticker-pack-copy">
                <div>
                  <span>微信表情包</span>
                  <h3>{pack.name}</h3>
                </div>

                <figure className="sticker-pack-qr">
                  <img
                    src={pack.qrSrc}
                    width="444"
                    height="444"
                    alt={`${pack.name}微信表情包二维码`}
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption>微信扫一扫</figcaption>
                </figure>

                <div className="sticker-pack-actions">
                  <button type="button" onClick={() => void handleCopy(pack.name, pack.installUrl)}>
                    {copyStatus?.name === pack.name && copyStatus.copied ? "链接已复制" : "复制微信链接"}
                  </button>
                  <a href={pack.qrSrc} download={pack.downloadName}>保存二维码</a>
                  <p className="sticker-pack-copy-help" role="status" aria-live="polite">
                    {copyStatus?.name === pack.name && !copyStatus.copied
                      ? "复制失败，请再试一次。"
                      : "复制后，请到微信内粘贴并打开。"}
                  </p>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
