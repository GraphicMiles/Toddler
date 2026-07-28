#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
need(){ command -v "$1" >/dev/null || { echo "Missing command: $1" >&2; exit 1; }; }
need java; need npm; need git
java -version 2>&1 | awk -F'[".]' '/version/ { if ($2 < 21) exit 1 }' || { echo 'Java 21+ required' >&2; exit 1; }
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
test -n "$SDK" || { echo 'ANDROID_HOME or ANDROID_SDK_ROOT is required' >&2; exit 1; }
test -d "$SDK/platforms/android-35" || { echo 'Android SDK platform 35 missing' >&2; exit 1; }
test -d "$SDK/build-tools/35.0.0" || { echo 'Android Build Tools 35.0.0 missing' >&2; exit 1; }
test -d "$SDK/ndk/26.1.10909125" || { echo 'Android NDK 26.1.10909125 missing' >&2; exit 1; }
test -d "$SDK/cmake/3.22.1" || { echo 'Android CMake 3.22.1 missing' >&2; exit 1; }
"$ROOT/scripts/bootstrap-llama-cpp.sh" 2>/dev/null || true
# Bootstrap is intentionally retried by the workflow; report its result when available.
test -f "third_party/llama.cpp/include/llama.h" || { echo 'llama.cpp bootstrap failed' >&2; exit 1; }
echo 'Android environment preflight passed.'
