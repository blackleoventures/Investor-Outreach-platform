// Use the single, centralized Admin instance to avoid mismatched credentials
const admin = require("./firebase.config");

const db = admin.firestore();

// Helper functions for common database operations
const dbHelpers = {
  // Create a new document
  async create(collection, data) {
    try {
      console.log(`Creating document in ${collection}:`, data);
      const docRef = await db.collection(collection).add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Document created with ID: ${docRef.id}`);
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error(`Error creating document in ${collection}:`, error);
      throw new Error(`Error creating document: ${error.message}`);
    }
  },

  // Get a document by ID
  async getById(collection, id) {
    try {
      const doc = await db.collection(collection).doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Error getting document: ${error.message}`);
    }
  },

  // Get all documents with optional filtering and pagination
  async getAll(collection, options = {}) {
    try {
      let query = db.collection(collection);
      
      // Apply filters
      if (options.filters) {
        Object.keys(options.filters).forEach(key => {
          if (options.filters[key] !== undefined && options.filters[key] !== null) {
            query = query.where(key, '==', options.filters[key]);
          }
        });
      }

      // Apply sorting
      if (options.sortBy) {
        query = query.orderBy(options.sortBy, options.sortOrder || 'desc');
      }

      // Apply pagination
      if (options.page && options.limit) {
        const skip = (parseInt(options.page) - 1) * parseInt(options.limit);
        query = query.offset(skip).limit(parseInt(options.limit));
      }

      const snapshot = await query.get();
      const documents = [];
      snapshot.forEach(doc => {
        documents.push({ id: doc.id, ...doc.data() });
      });

      return documents;
    } catch (error) {
      throw new Error(`Error getting documents: ${error.message}`);
    }
  },

  // Update a document
  async update(collection, id, data) {
    try {
      await db.collection(collection).doc(id).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { id, ...data };
    } catch (error) {
      throw new Error(`Error updating document: ${error.message}`);
    }
  },

  // Delete a document
  async delete(collection, id) {
    try {
      await db.collection(collection).doc(id).delete();
      return { id };
    } catch (error) {
      throw new Error(`Error deleting document: ${error.message}`);
    }
  },

  // Count documents
  async count(collection, filters = {}) {
    try {
      let query = db.collection(collection);
      
      // Apply filters
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          query = query.where(key, '==', filters[key]);
        }
      });

      const snapshot = await query.get();
      return snapshot.size;
    } catch (error) {
      throw new Error(`Error counting documents: ${error.message}`);
    }
  },

  // Find one document with filters
  async findOne(collection, filters = {}) {
    try {
      let query = db.collection(collection);
      
      // Apply filters
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          query = query.where(key, '==', filters[key]);
        }
      });

      const snapshot = await query.limit(1).get();
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Error finding document: ${error.message}`);
    }
  }
};

module.exports = { db, dbHelpers }; 