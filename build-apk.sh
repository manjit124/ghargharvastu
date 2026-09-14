#!/usr/bin/env bash
set -e

echo "=== Building VastuVision AI Android Release APK ==="

SDK_DIR="/opt/android-sdk"
BUILD_TOOLS="$SDK_DIR/build-tools/34.0.0"
PLATFORM="$SDK_DIR/platforms/android-34/android.jar"

cd "$(dirname "$0")/android-app"

# Clean previous build artifacts
rm -rf build
mkdir -p build/compiled-res build/gen build/classes build/dex

echo "[1/6] Compiling Android resources..."
"$BUILD_TOOLS/aapt2" compile --dir res -o build/compiled-res/

echo "[2/6] Linking Android resources & generating R.java..."
"$BUILD_TOOLS/aapt2" link \
  -I "$PLATFORM" \
  --manifest AndroidManifest.xml \
  -o build/unaligned.apk \
  --java build/gen/ \
  --auto-add-overlay \
  build/compiled-res/*.flat

echo "[3/6] Compiling Java source code..."
javac -source 8 -target 8 -cp "$PLATFORM" -d build/classes build/gen/ai/vastuvision/app/R.java src/ai/vastuvision/app/MainActivity.java

echo "[4/6] Converting bytecode to Dalvik Executable (classes.dex)..."
"$BUILD_TOOLS/d8" --min-api 24 --lib "$PLATFORM" --output build/dex/ $(find build/classes -name "*.class")
(cd build/dex && zip -u ../unaligned.apk classes.dex)

echo "[5/6] Aligning APK (4-byte boundary)..."
"$BUILD_TOOLS/zipalign" -v -p 4 build/unaligned.apk build/aligned.apk

echo "[6/6] Signing APK with release keystore..."
if [ ! -f release.keystore ]; then
  keytool -genkey -v -keystore release.keystore -alias vastuvision -keyalg RSA -keysize 2048 -validity 10000 -storepass vastuvision2026 -keypass vastuvision2026 -dname "CN=VastuVision AI, OU=Mobile, O=VastuVision Technologies, L=Mumbai, ST=Maharashtra, C=IN"
fi

"$BUILD_TOOLS/apksigner" sign \
  --ks release.keystore \
  --ks-key-alias vastuvision \
  --ks-pass pass:vastuvision2026 \
  --key-pass pass:vastuvision2026 \
  --out VastuVision-AI.apk \
  build/aligned.apk

echo "=== Verifying APK signature ==="
"$BUILD_TOOLS/apksigner" verify --verbose VastuVision-AI.apk

echo "Copying to web server public distribution directory..."
cp VastuVision-AI.apk ../public/vastuvision-ai.apk
cp VastuVision-AI.apk ../public/VastuVision-AI.apk
mkdir -p ../dist
cp VastuVision-AI.apk ../dist/vastuvision-ai.apk
cp VastuVision-AI.apk ../dist/VastuVision-AI.apk

echo "=== Success! VastuVision-AI.apk is ready ==="
ls -lh VastuVision-AI.apk
