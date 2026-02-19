
import { Shipment, RawShipmentData } from '../types';
import { parseCurrency, parseDate, parseNumber, parseCSVComplete } from '../utils';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS8M_YkHV0HkIjLkXWCMxErRgn7VQ51lrczgDgGtLy0sMRpoukcE_ErWvFIgsaOPCx7hPuCIqZ9Q8Gt/pub?output=csv';

export const fetchShipmentData = async (): Promise<Shipment[]> => {
  try {
    // Adiciona timestamp único e um parâmetro randômico para ignorar QUALQUER cache
    const cacheBuster = `cb=${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const response = await fetch(`${CSV_URL}&${cacheBuster}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: ${response.statusText}`);
    }
    const text = await response.text();
    return parseData(text);
  } catch (error) {
    console.error("Erro ao carregar dados da planilha", error);
    return [];
  }
};

const parseData = (csvText: string): Shipment[] => {
  const rows = parseCSVComplete(csvText);
  let shipments: Shipment[] = [];

  // Pular cabeçalho (i=1)
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

    const date = parseDate(raw.dateStr);

    if (date) {
      const weight = parseNumber(raw.weightStr);
      const value = parseCurrency(raw.valueStr);
      
      shipments.push({
        id: `${raw.cte}-${i}-${Date.now()}`,
        cte: raw.cte,
        date: date, // Usa a data real da planilha agora
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
