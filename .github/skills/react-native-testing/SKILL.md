---
name: react-native-testing
description: Select and execute React Native, Jest, native, emulator, and device verification proportional to the changed boundary.
---

# React Native Testing

Select verification by changed boundary:

- TypeScript/domain logic: focused Jest tests plus lint.
- Service/auth/persistence behavior: focused tests plus relevant integration verification.
- UI behavior: focused tests plus emulator/device verification when visual or native behavior matters.
- Native Android/iOS changes: platform build and runtime verification where available.
- Release changes: use the complete release-verification skill.

Use the repository's actual scripts. Distinguish mocked/unit passes from integration, device, and release evidence. Record environment limitations rather than silently downgrading the claim.