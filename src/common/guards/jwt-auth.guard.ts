/**
 * @deprecated Use FirebaseAuthGuard imported directly from './firebase-auth.guard' instead.
 *
 * This file is kept only for backward compatibility during migration.
 * All controllers have been updated to import FirebaseAuthGuard directly.
 * This alias file will be removed in a future cleanup.
 *
 * WHY THIS EXISTS:
 * The project originally used a JWT strategy. Auth was later migrated to
 * Firebase. Rather than update every controller at once, a re-export alias
 * was left here so existing imports kept compiling without changes.
 * That migration is now complete — all controllers import FirebaseAuthGuard
 * directly, so this file is no longer needed.
 */
export { FirebaseAuthGuard as JwtAuthGuard } from './firebase-auth.guard';

