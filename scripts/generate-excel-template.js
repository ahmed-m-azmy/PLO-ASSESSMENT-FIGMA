/**
 * Script to generate Excel template for Indirect PLO Assessment import
 * Run: node scripts/generate-excel-template.js
 */

import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create template data
const templateData = [
  // Header row
  ['PLO', 'Indirect Value (%)', 'Academic Year'],
  
  // Example rows
  ['PLO-1.1', 75, '2024-2025'],
  ['PLO-1.2', 68, '2024-2025'],
  ['PLO-1.3', 82, '2024-2025'],
  ['PLO-2.1', 70, '2024-2025'],
  ['PLO-2.2', 76, '2024-2025'],
  ['PLO-2.3', 64, '2024-2025'],
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(templateData);

// Set column widths
worksheet['!cols'] = [
  { wch: 15 }, // PLO column
  { wch: 20 }, // Indirect Value column
  { wch: 18 }, // Academic Year column
];

// Format header row (bold)
const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: 'FF8C00' } }, // Orange color
  alignment: { horizontal: 'center', vertical: 'center' },
};

['A1', 'B1', 'C1'].forEach(cell => {
  if (worksheet[cell]) {
    worksheet[cell].s = headerStyle;
  }
});

// Format data cells (center alignment)
const dataStyle = {
  alignment: { horizontal: 'center', vertical: 'center' },
};

for (let row = 2; row <= templateData.length; row++) {
  ['A', 'B', 'C'].forEach(col => {
    const cell = `${col}${row}`;
    if (worksheet[cell]) {
      worksheet[cell].s = dataStyle;
    }
  });
}

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Indirect PLO');

// Save file
const outputDir = path.join(__dirname, '../templates');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const filePath = path.join(outputDir, 'indirect-plo-template.xlsx');
XLSX.writeFile(workbook, filePath);

console.log(`✅ Excel template created: ${filePath}`);
console.log('\nTemplate Structure:');
console.log('- Column A: PLO (مثال: PLO-1.1, PLO-1.2)');
console.log('- Column B: Indirect Value (%) (0-100)');
console.log('- Column C: Academic Year (مثال: 2024-2025)');
