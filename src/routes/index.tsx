import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FolderOpen, RotateCcw } from "lucide-react";
import { PartStage } from "@/components/part-stage";
import { disposePart, loadPartFile, makeSample, type LoadedPart } from "@/lib/load-part";

export const Route = createFileRoute("/")({ component: Home });

function mm(n: number) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function Home() {
  const [part, setPart] = useState<LoadedPart | null>(null);
  const [mounted, setMounted] = useState(false);
  const [spin, setSpin] = useState(true);
  const [wire, setWire] = useState(false);
  const [cutOn, setCutOn] = useState(false);
  const [cut, setCut] = useState(0);
  const [frameKey, setFrameKey] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const partRef = useRef<LoadedPart | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setSpin(false);
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
      setSpin(true);
      setFrameKey((n) => n + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not open that file.");
    }
  }

  return (
    <div
      className="flex h-dvh flex-col bg-bg text-fg"
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
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-fg/15 px-4 py-3">
        <div>
          <p className="font-mono text-xs tracking-widest text-lime uppercase">360 view</p>
          <h1 className="text-lg font-medium tracking-tight">Part Viewer</h1>
        </div>
        <p className="hidden max-w-xs text-right text-sm text-muted sm:block">
          It spins on its own. Grab it to look around.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className={`relative h-96 shrink-0 touch-none lg:h-auto lg:min-h-0 lg:flex-1 ${dragOver ? "ring-2 ring-lime ring-inset" : ""}`}>
          {mounted && part ? (
            <PartStage
              part={part}
              spin={spin}
              wire={wire}
              cut={cutOn ? cut : null}
              frameKey={frameKey}
              onUserMove={() => setSpin(false)}
            />
          ) : (
            <div className="grid h-full place-items-center bg-bg text-sm text-muted">Opening the stage…</div>
          )}
          <div className="pointer-events-none absolute top-3 left-3">
            <span className="inline-flex items-center rounded-full bg-surface/90 px-3 py-1 text-xs text-fg backdrop-blur-sm">
              {part ? part.name : "No part"}
            </span>
          </div>
        </div>

        <aside className="min-h-0 flex-1 overflow-y-auto border-t border-fg/15 lg:w-96 lg:flex-none lg:border-t-0 lg:border-l">
          <div className="grid gap-6 p-4">
            <section className="grid gap-3">
              <h2 className="font-mono text-xs tracking-widest text-muted uppercase">Part</h2>
              <p className="text-sm text-muted">
                Open an STL, OBJ, or GLB. The stage frames it, then turns it until you drag.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".stl,.obj,.glb,.gltf,model/stl,model/obj"
                className="hidden"
                onChange={(e) => {
                  void openFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lime px-4 text-sm font-medium text-bg"
              >
                <FolderOpen className="size-4" aria-hidden />
                Open a part
              </button>
              {err && <p className="text-sm text-lime">{err}</p>}
            </section>

            <div className="flex gap-2">
              <Toggle on={spin} label="Spin" onClick={() => setSpin((s) => !s)} />
              <Toggle on={wire} label="Wire" onClick={() => setWire((w) => !w)} />
              <Toggle on={cutOn} label="Cut" onClick={() => setCutOn((c) => !c)} />
            </div>

            {cutOn && (
              <label className="grid gap-1">
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span>Section</span>
                  <span className="w-20 text-right font-mono text-lime tabular-nums">{Math.round(cut * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={cut}
                  onChange={(e) => setCut(Number(e.target.value))}
                  className="h-8"
                />
              </label>
            )}

            <button
              type="button"
              onClick={() => setFrameKey((n) => n + 1)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-fg/15 px-4 text-sm font-medium"
            >
              <RotateCcw className="size-4" aria-hidden />
              Reset view
            </button>

            {part && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-sm">
                <Stat k="Width" v={part.size.x} />
                <Stat k="Height" v={part.size.y} />
                <Stat k="Depth" v={part.size.z} />
                <div className="flex items-baseline justify-between gap-2 border-b border-fg/10 pb-1">
                  <dt className="text-muted">Triangles</dt>
                  <dd className="tabular-nums text-fg">{part.triangles.toLocaleString()}</dd>
                </div>
              </dl>
            )}

            <p className="text-sm text-muted">
              Drag to orbit. Spin starts again from the button. Dimensions are in the file’s own units. STL and OBJ use the studio plastic. GLB keeps its own materials.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-11 flex-1 rounded-xl border text-sm font-medium ${on ? "border-lime bg-lime text-bg" : "border-fg/15 text-muted"}`}
    >
      {label}
    </button>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-fg/10 pb-1">
      <dt className="text-muted">{k}</dt>
      <dd className="tabular-nums text-fg">{mm(v)}</dd>
    </div>
  );
}
