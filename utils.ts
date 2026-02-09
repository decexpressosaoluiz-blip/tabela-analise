
// Helper to parse currency robustly handling BR and US formats
export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  // Remove R$ and spaces
  let clean = value.toString().replace(/[R$\s]/g, '').trim();

  if (!clean) return 0;

  const hasComma = clean.includes(',');
  const hasDot = clean.includes('.');

  if (hasComma && hasDot) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      // 1.234,56 -> 1234.56
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 -> 1234.56
      clean = clean.replace(/,/g, '');
    }
  } else if (hasComma) {
    // 123,45 -> 123.45 (Assume comma is decimal in BR context)
    clean = clean.replace(',', '.');
  } 
  // If only dot: "123.45". 
  // In BR logistics data, "1.200" is ambiguous (1200 or 1.2). 
  // However, usually API/CSV exports don't put thousands separators on integers unless formatted as text.
  // We'll treat it as standard float.

  return parseFloat(clean) || 0;
};

export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
};

export const parseNumber = (numStr: string): number => {
  if (!numStr) return 0;
  return parseCurrency(numStr);
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

// FULL CSV PARSER handling newlines inside quotes
export const parseCSVComplete = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentVal += '"';
        i++; // Skip next quote
      } else {
        // Toggle state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Cell separator
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      // Row separator
      // Handle \r\n
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      // Only push if row has content
      if (currentRow.length > 0 || currentVal.trim()) {
        currentRow.push(currentVal.trim());
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  
  // Push last row
  if (currentRow.length > 0 || currentVal.trim()) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }

  return rows;
};
