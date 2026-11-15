import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PartStage } from "@/components/part-stage";
import { disposePart, loadPartFile, makeSample, type LoadedPart } from "@/lib/load-part";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [part, setPart] = useState<LoadedPart | null>(null);
  const [mounted, setMounted] = useState(false);
  const [spin, setSpin] = useState(true);
  const [frameKey, setFrameKey] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const partRef = useRef<LoadedPart | null>(null);
  const reduceRef = useRef(false);

  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceRef.current) setSpin(false);
    const sample = makeSample();
    partRef.current = sample;
    setPart(sample);
    setMounted(true);
    return () => disposePart(partRef.current);
  }, []);

  async function openFile(file: File | undefined) {
    if (!file) return;
    setErr(null);
    try {
      const next = await loadPartFile(file);
      disposePart(partRef.current);
      partRef.current = next;
      setPart(next);
      if (!reduceRef.current) setSpin(true);
      setFrameKey((n) => n + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not open that file.");
    }
  }

  return (
    <div
      className="relative h-dvh bg-bg text-fg"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void openFile(e.dataTransfer.files[0]);
      }}
    >
      <div className={`h-full touch-none ${dragOver ? "ring-2 ring-lime ring-inset" : ""}`}>
        {mounted && part ? (
          <PartStage
            part={part}
            spin={spin}
            frameKey={frameKey}
            onGrab={() => setSpin(false)}
            onRelease={() => {
              if (!reduceRef.current) setSpin(true);
            }}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted">Opening the stage…</div>
        )}
      </div>
      <div className="pointer-events-none absolute top-3 left-4">
        <p className="font-mono text-xs tracking-widest text-lime uppercase">360 view</p>
        <h1 className="text-lg font-medium tracking-tight">Part Viewer</h1>
      </div>
      {err && <p className="pointer-events-none absolute bottom-4 left-4 text-sm text-lime">{err}</p>}
    </div>
  );
}
