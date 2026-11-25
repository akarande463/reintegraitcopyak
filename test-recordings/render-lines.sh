#!/bin/bash
# Speak every line in lines.tsv with macOS `say` and save one WAV per line in wav/<case>/NN.wav.
# Then mix them (crosstalk, noise, phone quality) with: python3 build.py --mix wav
# Run on a Mac from this folder:  bash render-lines.sh
set -euo pipefail
cd "$(dirname "$0")"
installed="$(say -v '?' | sed -E 's/ +[a-z]{2,3}_[A-Za-z0-9]+ +#.*$//')"
mkdir -p wav
printf 'case\tline\tspeaker\tvoice\n' > wav/voices-used.tsv
tmp="$(mktemp)"
tail -n +2 lines.tsv | while IFS=$'\t' read -r case line speaker voices text; do
  voice=""
  IFS='|' read -ra options <<< "$voices"
  for v in "${options[@]}"; do
    if grep -qxF "$v" <<< "$installed"; then voice="$v"; break; fi
  done
  [ -z "$voice" ] && voice="Samantha"
  mkdir -p "wav/$case"
  printf '%s' "$text" > "$tmp"
  say -v "$voice" -r 165 -f "$tmp" -o "wav/$case/$line.wav" --file-format=WAVE --data-format=LEI16@22050
  printf '%s\t%s\t%s\t%s\n' "$case" "$line" "$speaker" "$voice" >> wav/voices-used.tsv
  echo "$case $line  $speaker -> $voice"
done
rm -f "$tmp"
echo "Done. Voices used are in wav/voices-used.tsv"
