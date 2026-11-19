#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/build/search-photos"
ZIP="$ROOT/build/search-photos.zip"

rm -rf "$BUILD" "$ZIP"
mkdir -p "$BUILD"

python3 -m pip install opensearch-py \
  --target "$BUILD" \
  --platform manylinux2014_x86_64 \
  --implementation cp \
  --python-version 3.15 \
  --only-binary=:all: \
  --quiet

cp "$ROOT/lambda-functions/search-photos.py" "$BUILD/lambda_function.py"
(cd "$BUILD" && zip -rq "$ZIP" .)
echo "Created $ZIP"
