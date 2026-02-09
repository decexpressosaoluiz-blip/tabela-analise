import { Shipment, RawShipmentData } from '../types';
import { parseCurrency, parseDate, parseNumber, parseCSVComplete } from '../utils';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS8M_YkHV0HkIjLkXWCMxErRgn7VQ51lrczgDgGtLy0sMRpoukcE_ErWvFIgsaOPCx7hPuCIqZ9Q8Gt/pub?output=csv';

// SIMULATION CONSTANTS
const TARGET_CURRENT_DATE = new Date(2026, 1, 6); // Feb 6, 2026 (Target "Today")

export const fetchShipmentData = async (): Promise<Shipment[]> => {
  try {
    const response = await fetch(`${CSV_URL}&t=${new Date().getTime()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    const text = await response.text();
    return parseData(text);
  } catch (error) {
    console.error("Error loading data", error);
    return [];
  }
};

const parseData = (csvText: string): Shipment[] => {
  const rows = parseCSVComplete(csvText);
  let shipments: Shipment[] = [];
  let maxDateInSource = new Date(0);

  // First pass: Parse and find the latest date in the source data
  for (let i = 1; i < rows.length; i++) {
    const columns = rows[i];
    if (columns.length < 10) continue; 
    const dateStr = columns[2];
    const parsedDate = parseDate(dateStr);
    if (parsedDate && parsedDate > maxDateInSource) {
      maxDateInSource = parsedDate;
    }
  }

  // Calculate Time Shift Offset (Difference between Real Max Date and Target Simulation Date)
  const timeShiftVal = TARGET_CURRENT_DATE.getTime() - maxDateInSource.getTime();

  // Second pass: Process and Shift Dates
  for (let i = 1; i < rows.length; i++) {
    const columns = rows[i];
    if (columns.length < 10) continue; 

    const raw: RawShipmentData = {
      cte: columns[0],
      series: columns[1],
      dateStr: columns[2],
      origin: columns[3],
      destination: columns[4],
      route: columns[5],
      valueStr: columns[6],
      weightStr: columns[7],
      volumesStr: columns[8],
      tableName: columns[9]?.trim(), 
      payer: columns[10],
      paymentType: columns[11]
    };

    const originalDate = parseDate(raw.dateStr);

    if (originalDate) {
      // Apply Time Shift
      const shiftedDate = new Date(originalDate.getTime() + timeShiftVal);
      
      const weight = parseNumber(raw.weightStr);
      const value = parseCurrency(raw.valueStr);
      
      shipments.push({
        id: `${raw.cte}-${i}`,
        cte: raw.cte,
        date: shiftedDate, // Use Shifted Date
        origin: raw.origin,
        destination: raw.destination,
        route: raw.route,
        value: value,
        weight: weight,
        volumes: parseNumber(raw.volumesStr),
        tableName: raw.tableName || "Sem Tabela", 
        payer: raw.payer,
        paymentType: raw.paymentType
      });
    }
  }

  return shipments;
};