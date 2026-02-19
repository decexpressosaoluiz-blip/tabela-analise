
// Helper to parse currency robustly handling BR and US formats
export const parseCurrency = (value: string | number): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  
  // Remove R$, spaces and handle BR format (dots as thousand separator)
  let clean = value.toString().replace(/[R$\s]/g, '').trim();
  if (!clean) return 0;

  // Se tiver vírgula e ponto, remove o ponto (milhar) e troca vírgula por ponto (decimal)
  if (clean.includes(',') && clean.includes('.')) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',')) {
    // Apenas vírgula: trata como decimal BR
    clean = clean.replace(',', '.');
  }

  return parseFloat(clean) || 0;
};

export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  // Suporta formatos DD/MM/YYYY e ISO
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
      return new Date(year, month, day);
    }
  }
  
  const isoDate = new Date(dateStr);
  return isNaN(isoDate.getTime()) ? null : isoDate;
};

export const parseNumber = (numStr: string | number): number => {
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
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
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
  
  if (currentRow.length > 0 || currentVal.trim()) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }

  return rows;
};
