# Build and install from an Android phone

No laptop is required if GitHub Actions is enabled for the repository.

1. Open the repository in GitHub from the phone.
2. Open **Actions** and select **Build Android APK**.
3. Tap **Run workflow** and run it on `main`.
4. Wait for the workflow to finish.
5. Open the completed workflow run.
6. Download the `forgeai-debug-apk` artifact.
7. Extract the ZIP on the phone and tap `app-debug.apk`.
8. Allow the browser or file manager to install unknown apps when Android asks.
9. Install and launch ForgeAI.

The workflow runs tests, builds the web app, syncs Capacitor, builds the Android native runtime, and uploads the APK. It does not prove that every phone is compatible; the app must still reject devices when measured RAM or storage is insufficient.

For the current on-device milestone, the Android build contains the guarded llama.cpp native foundation. The React app still needs the final model-download and model-selection wiring before this should be treated as a standalone offline release.
