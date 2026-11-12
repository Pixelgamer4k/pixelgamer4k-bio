#!/bin/bash
# Interactive updater for the funding amount and download link in index.html.
# Press Enter at any prompt to keep the current value.

cd "$(dirname "$0")" || exit 1
FILE="index.html"

if [ ! -f "$FILE" ]; then
  echo "Error: $FILE not found."
  exit 1
fi

current_raised=$(sed -n 's/.*data-raised="\([^"]*\)".*/\1/p' "$FILE" | head -n 1)
current_link=$(sed -n 's/.*id="downloadBtn" href="\([^"]*\)".*/\1/p' "$FILE" | head -n 1)

echo "Pixel Gamer 4k - site updater"
echo "Press Enter to keep the current value."
echo

# 1. Amount raised
printf "How much has been raised? (previous: \$%s): \$" "$current_raised"
read -r new_raised

if [ -z "$new_raised" ]; then
  new_raised="$current_raised"
fi

if ! [[ "$new_raised" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
  echo "Error: '$new_raised' is not a number. Nothing was changed."
  exit 1
fi

# 2. Download link
printf "Download link (current: %s): " "$current_link"
read -r new_link

if [ -z "$new_link" ]; then
  new_link="$current_link"
fi

if ! [[ "$new_link" =~ ^https?:// ]]; then
  echo "Error: the link must start with http:// or https://. Nothing was changed."
  exit 1
fi

# Apply changes (escape characters that are special in sed replacements)
escaped_link=$(printf '%s' "$new_link" | sed 's/[&|\\]/\\&/g')
tmp_file=$(mktemp)

sed -e "s|data-raised=\"[^\"]*\"|data-raised=\"$new_raised\"|" \
    -e "s|id=\"downloadBtn\" href=\"[^\"]*\"|id=\"downloadBtn\" href=\"$escaped_link\"|" \
    "$FILE" > "$tmp_file" && mv "$tmp_file" "$FILE"

echo
echo "Updated $FILE:"
echo "  Raised:        \$$new_raised"
echo "  Download link: $new_link"
echo
echo "To publish, run:"
echo "  git add index.html && git commit -m \"Update funding and download link\" && git push"
