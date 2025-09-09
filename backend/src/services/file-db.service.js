const fs = require('fs').promises;
const path = require('path');
const Papa = require('papaparse');
const XLSX = require('xlsx');

const DB_FILE = path.join(__dirname, '../../data/investors.xlsx');

class FileDBService {
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Investors');
    XLSX.writeFile(workbook, DB_FILE);
  }

  async uploadFile(filePath, fileExtension) {
    let data = [];
    
    if (fileExtension === 'csv') {
      const content = await fs.readFile(filePath, 'utf-8');
      const result = Papa.parse(content, { header: true, skipEmptyLines: true });
      data = result.data;
    } else if (['xlsx', 'xls'].includes(fileExtension)) {
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(worksheet);
    }

    await this.writeData(data);
    return data.length;
  }

  async getAllInvestors() {
    return await this.readData();
  }

  async addInvestor(investor) {
    const data = await this.readData();
    const newId = data.length > 0 ? Math.max(...data.map(i => i.id)) + 1 : 1;
    const newInvestor = { id: newId, ...investor };
    data.push(newInvestor);
    await this.writeData(data);
    return newInvestor;
  }

  async updateInvestor(id, updates) {
    const data = await this.readData();
    const index = data.findIndex(i => i.id == id);
    if (index === -1) throw new Error('Investor not found');
    
    data[index] = { ...data[index], ...updates, id: data[index].id };
    await this.writeData(data);
    return data[index];
  }

  async deleteInvestor(id) {
    const data = await this.readData();
    const filtered = data.filter(i => i.id != id);
    if (filtered.length === data.length) throw new Error('Investor not found');
    
    await this.writeData(filtered);
    return { id };
  }
}

module.exports = new FileDBService();