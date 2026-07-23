# ForgeAI ProGuard Rules

# Keep Capacitor
-keep class com.getcapacitor.** { *; }
-keep class io.ionic.keyboard.** { *; }

# Keep Firebase
-keep class com.google.firebase.** { *; }

# Keep WebLLM
-keep class com.mlc.** { *; }

# Keep app classes
-keep class ai.forgeai.app.** { *; }
