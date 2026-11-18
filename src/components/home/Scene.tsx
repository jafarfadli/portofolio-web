import type { CSSProperties } from "react";
import type { MediaRef } from "@/content/home";
import type { DeviceScene } from "@/content/device-scenes";
import { withBase } from "@/lib/base-path";

export type SceneShot = { shot: MediaRef; i: number };

export function Shots({ shots, sizes, objectPosition }: { shots: SceneShot[]; sizes: string; objectPosition?: string }) {
  return shots.map(({ shot, i }, n) => (
    <img
      key={i}
      className={n === 0 ? "is-on" : undefined}
      data-step={i}
      src={shot.url}
      srcSet={shot.srcSet}
      sizes={sizes}
      alt={shot.alt}
      width={shot.width}
      height={shot.height}
      loading="lazy"
      style={objectPosition ? { objectPosition } : undefined}
    />
  ));
}

/** A rendered photo of the devices with black screens; the screenshots lie on the screens in the photo's own
 *  perspective (see device-scenes.ts), so they keep turning like the print's. A phone card may show its own frame of
 *  the room (scene.mobile): the photo comes from a <picture> source, and each pose is given for both frames as CSS
 *  variables (--d-* on a desk, --m-* on a phone), so the screens stay one set of elements. */
export function Scene({ scene, slug, layout, shots, phoneShot }: { scene: DeviceScene; slug: string; layout: "wide" | "half"; shots: SceneShot[]; phoneShot: MediaRef | null }) {
  const m = scene.mobile ?? scene;
  const pose = (name: "laptop" | "phone") => {
    const vars: Record<string, string> = {};
    for (const [k, s] of [["d", scene.screens[name]], ["m", m.screens[name]]] as const) {
      if (!s) continue;
      vars[`--${k}-w`] = `${s.w}cqw`;
      vars[`--${k}-h`] = `${s.h}cqw`;
      vars[`--${k}-tf`] = `translate3d(${s.t.map((v) => `${v}cqw`).join(", ")}) matrix3d(${s.m.join(", ")})`;
    }
    return vars as CSSProperties;
  };
  const src = (frame: string, w: number) => `${withBase(`/devices/${slug}${frame}-${w / 2}.webp`)} ${w / 2}w, ${withBase(`/devices/${slug}${frame}-${w}.webp`)} ${w}w`;
  return (
    <div className="scene" style={{ "--d-ar": `${scene.width} / ${scene.height}`, "--m-ar": `${m.width} / ${m.height}`, "--d-p": `${scene.perspective}cqw`, "--m-p": `${m.perspective}cqw` } as CSSProperties}>
      <picture>
        {scene.mobile ? <source media="(max-width: 860px)" srcSet={src("-m", m.width)} sizes="100vw" width={m.width} height={m.height} /> : null}
        <img
          className="scene-photo"
          src={withBase(`/devices/${slug}-${scene.width}.webp`)}
          srcSet={src("", scene.width)}
          sizes={layout === "half" ? "(max-width: 860px) 100vw, 640px" : "(max-width: 860px) 100vw, 1280px"}
          alt=""
          width={scene.width}
          height={scene.height}
          loading="lazy"
        />
      </picture>
      <div className="scene-view">
        <figure className={shots.length > 1 ? "scene-screen is-laptop has-stack" : "scene-screen is-laptop"} style={pose("laptop")} data-show>
          <Shots shots={shots} sizes="(max-width: 860px) 70vw, 720px" />
        </figure>
        {scene.screens.phone && m.screens.phone && phoneShot ? (
          <figure className="scene-screen is-phone" style={pose("phone")} aria-hidden="true">
            <img src={phoneShot.url} srcSet={phoneShot.srcSet} sizes="200px" alt="" width={phoneShot.width} height={phoneShot.height} loading="lazy" />
          </figure>
        ) : null}
      </div>
    </div>
  );
}
