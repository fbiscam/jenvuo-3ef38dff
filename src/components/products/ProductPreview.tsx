import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import featureVideo from "@/assets/videos/product-workflow-hd-v2.mp4.asset.json";
import featurePoster from "@/assets/videos/product-workflow-hd-v2-poster.jpg.asset.json";

export type ProductId = "terminal" | "bot" | "news" | "api";

export default function ProductPreview() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
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
  }, [paused]);
  return <div className="product-motion" data-preview="feature-loop">
    <video ref={ref} src={new URL(featureVideo.url, "https://jenvu.com").href} poster={new URL(featurePoster.url, "https://jenvu.com").href} muted loop playsInline preload="metadata" aria-label="Terminal, Bot, News Trading and API, illustrative feature animation" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    <Button variant="ghost" size="icon-sm" className="product-motion-control" title={playing ? "Pause animation" : "Play animation"} aria-label={playing ? "Pause animation" : "Play animation"} onClick={() => {
      const video = ref.current;
      if (!video) return;
      if (playing) { setPaused(true); video.pause(); }
      else { setPaused(false); void video.play().catch(() => setPlaying(false)); }
    }}>{playing ? <Pause /> : <Play />}</Button>
  </div>;
}
