// Re-use the exact same logic as globalSetup so DB is clean after tests too
import globalSetup from './global-setup';

export default async function globalTeardown() {
  await globalSetup();
  console.log('✅ [globalTeardown] DB restored to seed state');
}
