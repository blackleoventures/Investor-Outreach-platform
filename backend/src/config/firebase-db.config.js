const admin = require("./firebase.config");

const db = admin.firestore();

const dbHelpers = {
  async create(collection, data) {
    try {
      const timestamp = new Date().toISOString();
      const docRef = await db.collection(collection).add({
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
    } catch (error) {
      console.error(`[DB] Create failed in ${collection}:`, error.message);
      throw new Error(`Failed to create document: ${error.message}`);
    }
  },

  async getById(collection, id) {
    try {
      const doc = await db.collection(collection).doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error) {
      console.error(`[DB] GetById failed in ${collection}:`, error.message);
      throw new Error(`Failed to retrieve document: ${error.message}`);
    }
  },

  async getAll(collection, options = {}) {
    try {
      let query = db.collection(collection);

      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.where(key, "==", value);
          }
        });
      }

      if (options.sortBy) {
        query = query.orderBy(options.sortBy, options.sortOrder || "desc");
      }

      if (options.page && options.limit) {
        const skip = (parseInt(options.page) - 1) * parseInt(options.limit);
        query = query.offset(skip).limit(parseInt(options.limit));
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`[DB] GetAll failed in ${collection}:`, error.message);
      throw new Error(`Failed to retrieve documents: ${error.message}`);
    }
  },

  async update(collection, id, data) {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await db.collection(collection).doc(id).update(updateData);
      return { id, ...updateData };
    } catch (error) {
      console.error(
        `[DB] Update failed in ${collection}/${id}:`,
        error.message
      );
      throw new Error(`Failed to update document: ${error.message}`);
    }
  },

  async delete(collection, id) {
    try {
      await db.collection(collection).doc(id).delete();
      return { id };
    } catch (error) {
      console.error(
        `[DB] Delete failed in ${collection}/${id}:`,
        error.message
      );
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  },

  async count(collection, filters = {}) {
    try {
      let query = db.collection(collection);

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.where(key, "==", value);
        }
      });

      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch (error) {
      console.error(`[DB] Count failed in ${collection}:`, error.message);
      throw new Error(`Failed to count documents: ${error.message}`);
    }
  },

  async findOne(collection, filters = {}) {
    try {
      let query = db.collection(collection);

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.where(key, "==", value);
        }
      });

      const snapshot = await query.limit(1).get();
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error(`[DB] FindOne failed in ${collection}:`, error.message);
      throw new Error(`Failed to find document: ${error.message}`);
    }
  },

  async batchCreate(collection, dataArray) {
    try {
      const batch = db.batch();
      const timestamp = new Date().toISOString();
      const results = [];

      dataArray.forEach((data) => {
        const docRef = db.collection(collection).doc();
        batch.set(docRef, {
          ...data,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        results.push({ id: docRef.id, ...data });
      });

      await batch.commit();
      return results;
    } catch (error) {
      console.error(`[DB] BatchCreate failed in ${collection}:`, error.message);
      throw new Error(`Failed to batch create documents: ${error.message}`);
    }
  },

  async batchUpdate(collection, updates) {
    try {
      const batch = db.batch();
      const timestamp = new Date().toISOString();

      updates.forEach(({ id, data }) => {
        const docRef = db.collection(collection).doc(id);
        batch.update(docRef, { ...data, updatedAt: timestamp });
      });

      await batch.commit();
      return { updated: updates.length };
    } catch (error) {
      console.error(`[DB] BatchUpdate failed in ${collection}:`, error.message);
      throw new Error(`Failed to batch update documents: ${error.message}`);
    }
  },

  async exists(collection, id) {
    try {
      const doc = await db.collection(collection).doc(id).get();
      return doc.exists;
    } catch (error) {
      console.error(
        `[DB] Exists check failed in ${collection}/${id}:`,
        error.message
      );
      throw new Error(`Failed to check document existence: ${error.message}`);
    }
  },
};

module.exports = { db, dbHelpers };
