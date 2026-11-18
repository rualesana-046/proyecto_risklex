#!/bin/sh
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
source_svg="$root/resources/icon.svg"
work=$(mktemp -d)
mode=${1:-preview}

base="$work/icon-1024.png"
npx --no-install electron "$root/scripts/render-icon.js" "$source_svg" "$base" > /dev/null

if [ "$mode" = "preview" ]; then
  printf '%s\n' "$base"
  exit 0
fi

if [ "$mode" = "ico" ]; then
  sizes="$work/sizes"
  npx --no-install electron "$root/scripts/render-icon.js" "$source_svg" "$sizes" > /dev/null
  node "$root/scripts/pack-ico.ts" "$root/resources/icon.ico" "$sizes/icon-16.png" "$sizes/icon-24.png" "$sizes/icon-32.png" "$sizes/icon-48.png" "$sizes/icon-64.png" "$sizes/icon-128.png" "$sizes/icon-256.png"
  cp "$sizes/icon-512.png" "$root/resources/icon.png"
  printf '%s\n%s\n' "$root/resources/icon.ico" "$root/resources/icon.png"
  exit 0
fi

if [ "$mode" != "icns" ]; then
  printf 'Usage: %s [preview|icns|ico]\n' "$0" >&2
  exit 1
fi

iconset="$work/icon.iconset"
mkdir "$iconset"
for size in 16 32 128 256 512; do
  double=$((size * 2))
  sips -z "$size" "$size" "$base" --out "$iconset/icon_${size}x${size}.png" > /dev/null
  sips -z "$double" "$double" "$base" --out "$iconset/icon_${size}x${size}@2x.png" > /dev/null
done
iconutil -c icns "$iconset" -o "$root/resources/icon.icns"
printf '%s\n' "$root/resources/icon.icns"
