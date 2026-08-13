import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  type Firestore,
} from 'firebase/firestore';
import { useEmulator } from '../firebase';

export interface AdminRecord {
  id?: string;
  email: string;
  password?: string;
  name: string;
}

export const INITIAL_DEFAULT_ADMINS: AdminRecord[] = [
  {
    email: 'golandsh@gmail.com',
    password: 'Shlomi123!',
    name: 'שלומי גולנד',
  },
  {
    email: 'golandsh@hotmail.com',
    password: 'Fruitshop2486!',
    name: 'שלומי גולנד',
  },
  {
    email: 'itaycohen131@gmail.com',
    password: 'Fruitshop2486!',
    name: 'איתי כהן',
  },
];

/**
 * Ensures the `admins` collection has initial records ONLY when running on the local emulator.
 * In remote environments (QA / Production), it will NOT auto-seed documents into Firestore.
 */
export async function seedAdminsIfEmpty(db: Firestore): Promise<void> {
  if (!useEmulator) {
    return;
  }

  try {
    const snapshot = await getDocs(collection(db, 'admins'));
    if (snapshot.empty) {
      console.log('Seeding initial default admins into local Firestore emulator...');
      for (const admin of INITIAL_DEFAULT_ADMINS) {
        await addDoc(collection(db, 'admins'), admin);
      }
    }
  } catch (err) {
    console.error('Error seeding admins collection:', err);
  }
}

/**
 * Retrieves an admin document from the Firestore `admins` collection by email.
 */
export async function getAdminByEmail(
  db: Firestore,
  email: string
): Promise<AdminRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  await seedAdminsIfEmpty(db);

  try {
    const q = query(
      collection(db, 'admins'),
      where('email', '==', normalizedEmail)
    );
    let snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      ...(docSnap.data() as AdminRecord),
    };
  } catch (err) {
    console.error('Error fetching admin by email:', err);
    return null;
  }
}

/**
 * Verifies admin credentials against the Firestore `admins` collection.
 */
export async function verifyAdminInFirestore(
  db: Firestore,
  email: string,
  password: string
): Promise<{ success: boolean; admin?: AdminRecord; error?: string }> {
  const admin = await getAdminByEmail(db, email);

  if (!admin) {
    return { success: false, error: 'invalidCredentials' };
  }

  if (admin.password !== password) {
    return { success: false, error: 'invalidCredentials' };
  }

  return { success: true, admin };
}
