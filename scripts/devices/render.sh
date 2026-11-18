#!/bin/zsh
# Renders the work-card device scenes with Blender, then writes public/devices/*.webp and src/content/device-scenes.ts.
#   scripts/devices/render.sh                 all scenes (and their phone frames), full quality
#   scripts/devices/render.sh edith 0.5 24    one scene, half size, 24 samples (a quick look; not exported)
#   scripts/devices/render.sh edith-m 0.5 24  the same for its phone frame
# A scene with a "mobile" entry also gets a phone frame (<slug>-m): the same room in the frame a phone card shows,
# with the entry's keys (w, h, and anything else, such as cam) laid over the scene's own.
# Renders go to $OUT (default: a temp folder). Needs /Applications/Blender.app (Cycles on the Metal GPU).
set -e
here=${0:A:h}; repo=${here:h:h}
OUT=${OUT:-${TMPDIR:-/tmp}/portfolio-devices}; mkdir -p $OUT
BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
render() {
  local P=$(node -e '
const [file, name, scale, samples, out] = process.argv.slice(1);
const slug = name.replace(/-m$/, ""), all = JSON.parse(require("fs").readFileSync(file));
let s = all[slug]; if (name !== slug) s = { ...s, ...s.mobile }; delete s.mobile;
s.w = Math.round(s.w * +scale); s.h = Math.round(s.h * +scale); s.samples = +samples;
s.out = out + "/" + name + ".png"; console.log(JSON.stringify(s));' $here/scenes.json $1 $2 $3 $OUT)
  $BLENDER -b --factory-startup --python $here/scene.py -- "$P" 2>&1 | grep -E "Error|Traceback|Saved" || true
}
if [[ -n $1 ]]; then render $1 ${2:-1} ${3:-128}; echo "render in $OUT"; exit; fi
for s in $(node -e 'const a=require(process.argv[1]);console.log(Object.keys(a).flatMap(k=>a[k].mobile?[k,k+"-m"]:[k]).join(" "))' $here/scenes.json); do render $s 1 128; done
node $here/export.mjs $repo $OUT
