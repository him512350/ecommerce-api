import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

export const FirebaseAdminProvider: Provider = {
  provide: FIREBASE_ADMIN,
  inject: [ConfigService],
  useFactory: (config: ConfigService): admin.app.App => {
    // Guard against re-initialization on hot reload
    if (admin.apps.length > 0) {
      return admin.apps[0]!;
    }

    const projectId = config.get<string>('firebase.projectId');
    const clientEmail = config.get<string>('firebase.clientEmail');
    const privateKey = config.get<string>('firebase.privateKey');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing Firebase config. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env',
      );
    }

    return admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  },
};
