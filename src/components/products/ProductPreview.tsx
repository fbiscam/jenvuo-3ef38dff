import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import terminalVideo from "@/assets/products/terminal.mp4?url";
import botVideo from "@/assets/products/bot.mp4?url";
import newsVideo from "@/assets/products/news.mp4?url";
import apiVideo from "@/assets/products/api.mp4?url";
import terminalPoster from "@/assets/products/terminal-poster.jpg";
import botPoster from "@/assets/products/bot-poster.jpg";
import newsPoster from "@/assets/products/news-poster.jpg";
import apiPoster from "@/assets/products/api-poster.jpg";

export type ProductId = "terminal" | "bot" | "news" | "api";
const clips = {
  terminal: { video: terminalVideo, poster: terminalPoster, name: "Terminal research" },
  bot: { video: botVideo, poster: botPoster, name: "JX Bot account checks" },
  news: { video: newsVideo, poster: newsPoster, name: "News Trading release context" },
  api: { video: apiVideo, poster: apiPoster, name: "Platform and API response" },
};

export default function ProductPreview({ product }: { product: ProductId }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const clip = clips[product];
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => {
      if (visible && !motion.matches && !paused && !document.hidden) {
        void video.play().catch(() => setPlaying(false));
      } else video.pause();
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      update();
    }, { threshold: .25 });
    observer.observe(video);
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect(); motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update); video.pause();
    };
  }, [product, paused]);
  return <div className="product-motion" data-preview={product}>
    <video ref={ref} key={product} src={clip.video} poster={clip.poster} muted loop playsInline preload="metadata" aria-label={`${clip.name}, illustrative text animation`} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    <Button variant="ghost" size="icon-sm" className="product-motion-control" title={playing ? "Pause animation" : "Play animation"} aria-label={playing ? "Pause animation" : "Play animation"} onClick={() => {
      const video = ref.current;
      if (!video) return;
      if (playing) { setPaused(true); video.pause(); }
      else { setPaused(false); void video.play().catch(() => setPlaying(false)); }
    }}>{playing ? <Pause /> : <Play />}</Button>
  </div>;
}
