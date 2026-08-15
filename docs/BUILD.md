# SITE-SYNC Android Build Contract

## Toolchain baseline

Milestone 1 uses the current stable React Native release available at project start: **React Native 0.86.2** with the React Native Community CLI.

Required build components:

- Node.js >= 22.11.0
- JDK 17
- Android SDK platform 36
- Android Build Tools 36.0.0
- Android NDK 27.1.12297006
- Gradle 9.3.1 via the checked-in Gradle wrapper
- Hermes

React Native 0.86 is the current stable release at project start. The official 0.86 Community template pins Android compile/target SDK 36, Build Tools 36.0.0, NDK 27.1.12297006 and Gradle 9.3.1.

## Build command

```bash
cd android
./gradlew assembleRelease
```

The resulting APK must contain the React Native/Hermes production bundle and must launch without Metro or a development server.

## CI

GitHub Actions is the reproducible clean-room build authority for Milestone 1. CI must install the declared Android SDK components, run the Gradle wrapper, and publish the release APK as an artifact.

The workflow may bootstrap the initial React Native project from the official Community CLI template because the repository starts empty. The generated project becomes committed source; bootstrap automation is not part of the runtime application.

## Release signing

Milestone 1 may use the template debug signing configuration solely to prove APK generation and standalone launch. Production release signing credentials are a later deployment concern and must not be committed to the repository.
