#!/bin/zsh
# Renders the work-card device scenes with Blender, then writes public/devices/*.webp and src/content/device-scenes.ts.
#   scripts/devices/render.sh                 all scenes, full quality
#   scripts/devices/render.sh edith 0.5 24    one scene, half size, 24 samples (a quick look; not exported)
# Renders go to $OUT (default: a temp folder). Needs /Applications/Blender.app (Cycles on the Metal GPU).
set -e
here=${0:A:h}; repo=${here:h:h}
OUT=${OUT:-${TMPDIR:-/tmp}/portfolio-devices}; mkdir -p $OUT
BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
render() {
  local P=$(node -e '
const s=JSON.parse(require("fs").readFileSync(process.argv[1]))[process.argv[2]];
s.w=Math.round(s.w*+process.argv[3]); s.h=Math.round(s.h*+process.argv[3]); s.samples=+process.argv[4];
s.out=process.argv[5]+"/"+process.argv[2]+".png"; console.log(JSON.stringify(s));' $here/scenes.json $1 $2 $3 $OUT)
  $BLENDER -b --factory-startup --python $here/scene.py -- "$P" 2>&1 | grep -E "Error|Traceback|Saved" || true
}
if [[ -n $1 ]]; then render $1 ${2:-1} ${3:-128}; echo "render in $OUT"; exit; fi
for s in $(node -e 'console.log(Object.keys(require(process.argv[1])).join(" "))' $here/scenes.json); do render $s 1 128; done
node $here/export.mjs $repo $OUT
