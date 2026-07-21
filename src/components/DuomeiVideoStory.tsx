import { useRef } from "react";
import type { ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import type { DuomeiNote } from "../lib/noteTypes";

const videos = {
  featured: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4",
  philosophy: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4",
  serviceOne: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4",
  serviceTwo: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4",
} as const;

function Reveal({ children, className }: { children: ReactNode; className: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const visible = useInView(ref, { once: true, margin: "-12% 0px" });
  return (
    <motion.section
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={visible ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.section>
  );
}

function AtmosphereVideo({ src }: { src: string }) {
  return <video src={src} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />;
}

export function DuomeiVideoStory({ notes }: { notes: DuomeiNote[] }) {
  const featured = notes[0];
  const secondary = notes[1] ?? featured;
  const tertiary = notes[2] ?? secondary;

  return (
    <div className="dm4-story">
      <Reveal className="dm4-manifesto">
        <p>多美小记，不是另一条需要追赶的信息流。</p>
        <h2>
          先听见自己，
          <em>再看见世界。</em>
        </h2>
        <p>让一段旅途保留风声，让一张照片不急着被划走，让文字重新拥有停顿。</p>
      </Reveal>

      <Reveal className="dm4-featured">
        <div className="dm4-featured-media">
          <AtmosphereVideo src={videos.featured} />
          <div className="dm4-media-wash" />
        </div>
        <div className="dm4-glass dm4-featured-card">
          <span><Play size={14} fill="currentColor" aria-hidden="true" /> 本期光景</span>
          <h2>{featured?.title || "在路上，重新学会停留"}</h2>
          <p>{featured?.excerpt || "影像先抵达，文字随后。我们把真正值得留下的部分，放回你能慢慢读完的节奏里。"}</p>
          {featured ? <Link to={`/note/${featured.slug}`}>进入这一篇 <ArrowUpRight size={17} aria-hidden="true" /></Link> : <a href="#notes">进入小记 <ArrowUpRight size={17} aria-hidden="true" /></a>}
        </div>
      </Reveal>

      <Reveal className="dm4-philosophy">
        <div className="dm4-philosophy-copy">
          <p>感受 × 视野</p>
          <h2>不是把生活塞进模板，而是让每一段生活，长成自己的形状。</h2>
          <p>{secondary?.excerpt || "从图像、地点到一句忽然出现的话，多美把不同的记录方式放在同一片安静的空间里。"}</p>
          {secondary ? <Link to={`/note/${secondary.slug}`}>继续向里走 <ArrowUpRight size={17} aria-hidden="true" /></Link> : null}
        </div>
        <div className="dm4-philosophy-media">
          <AtmosphereVideo src={videos.philosophy} />
          <span>{secondary?.location || "旅途未完"}</span>
        </div>
      </Reveal>

      <Reveal className="dm4-duet">
        <article>
          <div className="dm4-duet-media"><AtmosphereVideo src={videos.serviceOne} /></div>
          <div className="dm4-duet-copy">
            <span>影像记忆</span>
            <h3>{secondary?.title || "看见，才有后来"}</h3>
            <p>{secondary?.excerpt || "照片保持完整，文字贴着真实发生的位置生长。"}</p>
          </div>
        </article>
        <article>
          <div className="dm4-duet-media"><AtmosphereVideo src={videos.serviceTwo} /></div>
          <div className="dm4-duet-copy">
            <span>文字回声</span>
            <h3>{tertiary?.title || "写下，才算抵达"}</h3>
            <p>{tertiary?.excerpt || "不需要宏大叙事，只要诚实地留住那一刻。"}</p>
          </div>
        </article>
      </Reveal>
    </div>
  );
}
