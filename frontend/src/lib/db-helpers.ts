import { adminDb } from "./firebase-admin";

interface GetAllOptions {
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

interface BatchUpdate {
  id: string;
  data: any;
}

export const dbHelpers = {
  /**
   * Create a new document in a collection
   */
  async create(collection: string, data: any) {
    try {
      const timestamp = new Date().toISOString();
      const docRef = await adminDb.collection(collection).add({
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      return {
        id: docRef.id,
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    } catch (error: any) {
      console.error(`[DB] Create failed in ${collection}:`, error.message);
      throw new Error(`Failed to create document: ${error.message}`);
    }
  },

  /**
   * Get a document by ID
   */
  async getById(collection: string, id: string) {
    try {
      const doc = await adminDb.collection(collection).doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error: any) {
      console.error(`[DB] GetById failed in ${collection}:`, error.message);
      throw new Error(`Failed to retrieve document: ${error.message}`);
    }
  },

  /**
   * Get all documents with optional filtering, sorting, and pagination
   */
  async getAll(collection: string, options: GetAllOptions = {}) {
    try {
      let query: any = adminDb.collection(collection);

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.where(key, "==", value);
          }
        });
      }

      // Apply sorting
      if (options.sortBy) {
        query = query.orderBy(options.sortBy, options.sortOrder || "desc");
      }

      // Apply pagination
      if (options.page && options.limit) {
        const skip = (parseInt(options.page.toString()) - 1) * parseInt(options.limit.toString());
        query = query.offset(skip).limit(parseInt(options.limit.toString()));
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error: any) {
      console.error(`[DB] GetAll failed in ${collection}:`, error.message);
      throw new Error(`Failed to retrieve documents: ${error.message}`);
    }
  },

  /**
   * Update a document by ID
   */
  async update(collection: string, id: string, data: any) {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await adminDb.collection(collection).doc(id).update(updateData);
      return { id, ...updateData };
    } catch (error: any) {
      console.error(`[DB] Update failed in ${collection}/${id}:`, error.message);
      throw new Error(`Failed to update document: ${error.message}`);
    }
  },

  /**
   * Delete a document by ID
   */
  async delete(collection: string, id: string) {
    try {
      await adminDb.collection(collection).doc(id).delete();
      return { id };
    } catch (error: any) {
      console.error(`[DB] Delete failed in ${collection}/${id}:`, error.message);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  },

  /**
   * Count documents with optional filters
   */
  async count(collection: string, filters: Record<string, any> = {}) {
    try {
      let query: any = adminDb.collection(collection);

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.where(key, "==", value);
        }
      });

      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch (error: any) {
      console.error(`[DB] Count failed in ${collection}:`, error.message);
      throw new Error(`Failed to count documents: ${error.message}`);
    }
  },

  /**
   * Find one document with filters
   */
  async findOne(collection: string, filters: Record<string, any> = {}) {
    try {
      let query: any = adminDb.collection(collection);

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.where(key, "==", value);
        }
      });

      const snapshot = await query.limit(1).get();
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error: any) {
      console.error(`[DB] FindOne failed in ${collection}:`, error.message);
      throw new Error(`Failed to find document: ${error.message}`);
    }
  },

  /**
   * Batch create multiple documents
   */
  async batchCreate(collection: string, dataArray: any[]) {
    try {
      const batch = adminDb.batch();
      const timestamp = new Date().toISOString();
      const results: any[] = [];

      dataArray.forEach((data) => {
        const docRef = adminDb.collection(collection).doc();
        batch.set(docRef, {
          ...data,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        results.push({ id: docRef.id, ...data });
      });

      await batch.commit();
      return results;
    } catch (error: any) {
      console.error(`[DB] BatchCreate failed in ${collection}:`, error.message);
      throw new Error(`Failed to batch create documents: ${error.message}`);
    }
  },

  /**
   * Batch update multiple documents
   */
  async batchUpdate(collection: string, updates: BatchUpdate[]) {
    try {
      const batch = adminDb.batch();
      const timestamp = new Date().toISOString();

      updates.forEach(({ id, data }) => {
        const docRef = adminDb.collection(collection).doc(id);
        batch.update(docRef, { ...data, updatedAt: timestamp });
      });

      await batch.commit();
      return { updated: updates.length };
    } catch (error: any) {
      console.error(`[DB] BatchUpdate failed in ${collection}:`, error.message);
      throw new Error(`Failed to batch update documents: ${error.message}`);
    }
  },

  /**
   * Check if a document exists
   */
  async exists(collection: string, id: string) {
    try {
      const doc = await adminDb.collection(collection).doc(id).get();
      return doc.exists;
    } catch (error: any) {
      console.error(`[DB] Exists check failed in ${collection}/${id}:`, error.message);
      throw new Error(`Failed to check document existence: ${error.message}`);
    }
  },
};
