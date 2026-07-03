import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

import { allocateNextId, reservePreferredId } from "./auto-increment";
import { descriptionsMatch } from "./product-row";

export interface ResolveCategoryInput {
    id?: number;
    name?: string;
    parentId: number | null;
}

export interface ResolvedCategory {
    id: number;
    description: string;
    parentId: number | null;
    created: boolean;
}

const getCategorySnapshot = async (db: Firestore, id: number) =>
    db.collection("categories").doc(String(id)).get();

const findCategoryByNameAndParent = async (
    db: Firestore,
    name: string,
    parentId: number | null,
): Promise<ResolvedCategory | null> => {
    const query = db.collection("categories").where("description", "==", name.trim());

    const snapshot =
        parentId === null
            ? await query.where("parentId", "==", null).limit(1).get()
            : await query.where("parentId", "==", parentId).limit(1).get();

    const doc = snapshot.docs[0];
    if (!doc) {
        return null;
    }

    return {
        id: Number(doc.get("id") ?? doc.id),
        description: String(doc.get("description") ?? ""),
        parentId: (doc.get("parentId") as number | null | undefined) ?? null,
        created: false,
    };
};

const createCategory = async (
    db: Firestore,
    description: string,
    parentId: number | null,
    preferredId?: number,
): Promise<ResolvedCategory> => {
    const categoryId =
        preferredId !== undefined ? preferredId : await allocateNextId(db, "categories");

    if (preferredId !== undefined) {
        await reservePreferredId(db, "categories", preferredId);
    }

    const categoryRef = db.collection("categories").doc(String(categoryId));

    await categoryRef.set({
        id: categoryId,
        description: description.trim(),
        parentId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    return {
        id: categoryId,
        description: description.trim(),
        parentId,
        created: true,
    };
};

const validateExistingCategory = (
    snapshot: FirebaseFirestore.DocumentSnapshot,
    input: ResolveCategoryInput,
): ResolvedCategory => {
    const storedDescription = String(snapshot.get("description") ?? "");
    const storedParentId = (snapshot.get("parentId") as number | null | undefined) ?? null;

    if (input.name !== undefined && !descriptionsMatch(storedDescription, input.name)) {
        throw new Error(
            input.parentId === null
                ? `CategoryID ${input.id} description mismatch (expected "${input.name}", found "${storedDescription}")`
                : `SubCategoryID ${input.id} description mismatch (expected "${input.name}", found "${storedDescription}")`,
        );
    }

    if (storedParentId !== input.parentId) {
        throw new Error(
            input.parentId === null
                ? `CategoryID ${input.id} is not a top-level category`
                : `SubCategoryID ${input.id} does not belong to parent category ${input.parentId}`,
        );
    }

    return {
        id: Number(snapshot.get("id") ?? snapshot.id),
        description: storedDescription,
        parentId: storedParentId,
        created: false,
    };
};

export const resolveCategory = async (
    db: Firestore,
    input: ResolveCategoryInput,
): Promise<ResolvedCategory> => {
    if (input.id !== undefined) {
        const snapshot = await getCategorySnapshot(db, input.id);

        if (!snapshot.exists) {
            if (input.name === undefined) {
                throw new Error(
                    input.parentId === null
                        ? `CategoryID ${input.id} does not exist`
                        : `SubCategoryID ${input.id} does not exist`,
                );
            }

            return createCategory(db, input.name, input.parentId, input.id);
        }

        return validateExistingCategory(snapshot, input);
    }

    if (input.name === undefined) {
        throw new Error("Category name is required when CategoryID is not provided");
    }

    const existing = await findCategoryByNameAndParent(db, input.name, input.parentId);
    if (existing) {
        return existing;
    }

    return createCategory(db, input.name, input.parentId);
};

export const resolveSubCategory = async (
    db: Firestore,
    parentCategoryId: number,
    input: Pick<ResolveCategoryInput, "id" | "name">,
): Promise<ResolvedCategory | null> => {
    if (input.id === undefined && input.name === undefined) {
        return null;
    }

    return resolveCategory(db, {
        id: input.id,
        name: input.name,
        parentId: parentCategoryId,
    });
};
