export interface RawShipmentData {
  cte: string;
  series: string;
  dateStr: string;
  origin: string;
  destination: string;
  route: string;
  valueStr: string;
  weightStr: string;
  volumesStr: string;
  tableName: string;
  payer: string;
  paymentType: string;
}

export interface Shipment {
  id: string;
  cte: string;
  date: Date;
  origin: string;
  destination: string;
  route: string;
  value: number;
  weight: number;
  volumes: number;
  tableName: string;
  payer: string;
  paymentType: string;
}

export interface FilterState {
  startDate: Date | null;
  endDate: Date | null;
  selectedTables: string[];
  selectedRoutes: string[];
}

export interface KPI {
  totalRevenue: number;
  totalDocs: number;
  totalWeight: number;
  avgTicket: number;
  revenuePerKg: number;
}