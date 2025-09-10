const { dbHelpers } = require('../config/firebase-db.config');

class IncubatorModel {
  constructor() {
    this.collection = 'incubators';
  }

  async create(data) {
    return await dbHelpers.create(this.collection, data);
  }

  async find(filters = {}) {
    return await dbHelpers.getAll(this.collection, { filters, sortBy: 'createdAt' });
  }

  async findById(id) {
    return await dbHelpers.getById(this.collection, id);
  }

  async insertMany(dataArray) {
    const results = [];
    for (const data of dataArray) {
      const result = await this.create(data);
      results.push(result);
    }
    return results;
  }

  async updateById(id, data) {
    return await dbHelpers.update(this.collection, id, data);
  }

  async deleteById(id) {
    return await dbHelpers.delete(this.collection, id);
  }
}

module.exports = new IncubatorModel(); 