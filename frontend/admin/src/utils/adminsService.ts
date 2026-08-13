import {
  collection,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';

export interface AdminRecord {
  id?: string;
  email: string;
  password?: string;
  name: string;
}

/**
 * Retrieves an admin document from the Firestore `admins` collection by email.
 */
export async function getAdminByEmail(
  db: Firestore,
  email: string
): Promise<AdminRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();

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
