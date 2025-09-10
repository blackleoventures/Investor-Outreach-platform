const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');
const XLSX = require('xlsx');

const DB_FILE = path.join(__dirname, '../../data/incubators.xlsx');

class IncubatorFileDBService {
  async ensureDataDir() {
    const dataDir = path.dirname(DB_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  async readData() {
    try {
      await this.ensureDataDir();
      const workbook = XLSX.readFile(DB_FILE);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      return data.map((item, index) => ({ id: index + 1, ...item }));
    } catch {
      return [];
    }
  }

  async writeData(data) {
    await this.ensureDataDir();
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Incubators');
    XLSX.writeFile(workbook, DB_FILE);
  }

  async processFile(filePath, fileExtension) {
    const normalizedExt = (fileExtension?.toString().trim().toLowerCase()) || path.extname(filePath).toLowerCase().slice(1);
    let data = [];

    if (normalizedExt === 'csv') {
      const content = await fs.readFile(filePath, 'utf-8');
      const result = Papa.parse(content, { header: true, skipEmptyLines: true });
      data = result.data;
    } else if (['xlsx', 'xls'].includes(normalizedExt)) {
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(worksheet);
    }

    try {
      await fs.unlink(filePath);
    } catch {}

    return data;
  }

  async uploadFile(filePath, fileExtension) {
    const rawRows = await this.processFile(filePath, fileExtension);

    // Normalize keys
    const headerMap = {
      'incubatorname': 'incubatorName',
      'incubator name': 'incubatorName',
      'name': 'incubatorName',
      'partnername': 'partnerName',
      'partner name': 'partnerName',
      'contact name': 'partnerName',
      'partneremail': 'partnerEmail',
      'partner email': 'partnerEmail',
      'email': 'partnerEmail',
      'email id': 'partnerEmail',
      'phonenumber': 'phoneNumber',
      'phone number': 'phoneNumber',
      'mobile': 'phoneNumber',
      'sectorfocus': 'sectorFocus',
      'sector focus': 'sectorFocus',
      'industry': 'sectorFocus',
      'country': 'country',
      'state': 'stateCity',
      'city': 'stateCity',
      'state/city': 'stateCity',
      'location': 'stateCity',
    };
    const normalizeKey = (k) => (k || '').toString().trim().toLowerCase();
    const normalized = rawRows
      .filter(row => Object.values(row || {}).some(v => (v ?? '').toString().trim()))
      .map(row => {
        const obj = {};
        for (const [k, v] of Object.entries(row)) {
          const mapped = headerMap[normalizeKey(k)] || k;
          obj[mapped] = typeof v === 'string' ? v.trim() : v;
        }
        return obj;
      });

    const existing = await this.readData();
    const nextId = existing.length > 0 ? Math.max(...existing.map(i => i.id)) + 1 : 1;
    const withIds = normalized.map((item, index) => ({ id: nextId + index, ...item }));
    const combined = [...existing, ...withIds];
    await this.writeData(combined);
    return normalized.length;
  }

  async getAllIncubators() {
    return await this.readData();
  }

  async addIncubator(incubator) {
    const data = await this.readData();
    const newId = data.length > 0 ? Math.max(...data.map(i => i.id)) + 1 : 1;
    const newItem = { id: newId, ...incubator };
    data.push(newItem);
    await this.writeData(data);
    return newItem;
  }

  async updateIncubator(id, updates) {
    const data = await this.readData();
    const index = data.findIndex(i => i.id == id);
    if (index === -1) throw new Error('Incubator not found');
    data[index] = { ...data[index], ...updates, id: data[index].id };
    await this.writeData(data);
    return data[index];
  }

  async deleteIncubator(id) {
    const data = await this.readData();
    const filtered = data.filter(i => i.id != id);
    if (filtered.length === data.length) throw new Error('Incubator not found');
    await this.writeData(filtered);
    return { id };
  }
}

module.exports = new IncubatorFileDBService();

