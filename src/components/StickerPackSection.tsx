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

export function StickerPackSection() {
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
                  <a href={pack.installUrl} target="_blank" rel="noreferrer">打开微信表情</a>
                  <a href={pack.qrSrc} download={pack.downloadName}>保存二维码</a>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
