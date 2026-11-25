# Firestore Security Specification (`sg-cv-maker`)

## 1. Data Invariants
1. Every `UserProfile` (`/users/{userId}/profile/master`) and `CVDocument` (`/users/{userId}/cvs/{cvId}`) belongs exclusively to `userId` (`ownerId == request.auth.uid`).
2. Only verified authenticated users (`request.auth != null && request.auth.token.email_verified == true`) may read or write their own PII-bearing profile and CV documents.
3. Document IDs (`cvId`) must match `^[a-zA-Z0-9_-]+$` and `<= 128` characters, and `CVDocument.id == cvId`.
4. `ownerId` and `createdAt` are immutable after creation; `createdAt` (on create) and `updatedAt` (on create/update) must equal `request.time`.
5. No ghost/shadow fields or oversized payloads are accepted (`hasAll`, `hasOnly`, string `.size()` bounds, array `.size()` bounds).
6. List queries on `/users/{userId}/cvs` require `resource.data.ownerId == request.auth.uid`.

## 2. Adversarial Test Payloads ("Dirty Dozen")
1. Unauthenticated read/write to `/users/u1/cvs/cv_1` -> `PERMISSION_DENIED`.
2. Authenticated user `u2` reading/writing `/users/u1/cvs/cv_1` -> `PERMISSION_DENIED`.
3. Unverified email user (`email_verified: false`) writing `/users/u1/profile/master` -> `PERMISSION_DENIED`.
4. Shadow/ghost field injection (`{ ..., isAdmin: true }`) on CV create -> `PERMISSION_DENIED`.
5. Spoofed `ownerId` (`ownerId: "victim"`) on CV create -> `PERMISSION_DENIED`.
6. Mutating `ownerId` or `createdAt` or `id` on CV update -> `PERMISSION_DENIED`.
7. Client-forged `updatedAt` (not `request.time`) -> `PERMISSION_DENIED`.
8. Oversized ID (`cvId` > 128 chars or with `/`/invalid chars) -> `PERMISSION_DENIED`.
9. Mismatched `data.id != cvId` -> `PERMISSION_DENIED`.
10. Blanket `list` query without `where('ownerId', '==', uid)` -> `PERMISSION_DENIED`.
11. Oversized `name` (> 140 chars) or `summary` (> 5000 chars) -> `PERMISSION_DENIED`.
12. Creating `/users/u1/profile/otherDoc` (`docId != 'master'`) -> `PERMISSION_DENIED`.
