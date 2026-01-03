export type ShiftType = "A" | "B" | "C";

export type QuantityType = "Meter" | "Kg";

export type StockStatus = "In" | "Out";

export interface Machine {
  id: string;
  machineNumber: string;
  machineType: string;
  shift: ShiftType;
  remarks?: string;
}

export interface Party {
  id: string;
  partyName: string;
  partyCode: string;
  brokerName?: string;
  phone?: string;
  gstNo?: string;
  address?: string;
}

export interface Design {
  id: string;
  designNumber: string;
  designName: string;
  itemName: string;
  hsnCode: string;
  color: string;
  gsm: string;
  lotNumber: string;
}

export interface Quality {
  id: string;
  fabricName: string;
  loomType: string;
  fabricType: string;
}

export interface Matching {
  id: string;
  matchingName: string;
}

export interface Factory {
  id: string;
  factoryName: string;
  gstNo?: string;
  factoryNo?: string;
  prefix?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export interface Salesman {
  id: string;
  salesmanName: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImageItem {
  id: string;
  imageUrl: string;
  qualityId: string;
  designId: string;
}

export type StockType = "Saree" | "Taka";

export interface Catalog {
  id: string;
  stockType: StockType;
  qualityId: string | Quality;
  designId: string | Design;
  matchingId: string | Matching | null;
  cut: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockEntry {
  id: string;
  machineNumber: string;
  machineType: string;
  shift: ShiftType;
  designNumber: string;
  designName: string;
  itemName: string;
  color: string;
  hsnCode: string;
  lotNumber: string;
  rollNumber: string;
  quantityMeters: number;
  quantityWeightKg: number;
  ratePerMeter: number;
  ratePerKg: number;
  totalAmount: number;
  quantityType: QuantityType;
  partyName: string;
  partyCode: string;
  brokerName: string;
  status: StockStatus;
  entryDate: string;
  entryTime: string;
  employeeName: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TakaDetail {
  takaNo: string;
  meter: number;
}

export interface MatchingQuantity {
  matchingId: string | Matching; // Can be populated with Matching object
  matchingName: string;
  quantity: number;
  dispatchedQuantity?: number; // Track dispatched quantity
}


export interface Production {
  id: string;
  date: string;
  factoryId: string | Factory;
  stockType: StockType;

  // For Taka
  qualityId?: string | Quality;
  takaDetails?: TakaDetail[];

  // For Saree (also uses qualityId)
  designId?: string | Design;
  matchingQuantities?: MatchingQuantity[];
  cut?: number;
  totalSaree?: number;

  // Common
  totalMeters: number;
  createdAt: string;
  updatedAt: string;
}

export interface Broker {
  id: string;
  brokerName: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderLineItem {
  qualityId: string | Quality;
  designId: string | Design;
  catalogType: StockType;

  // For Saree
  matchingQuantities?: MatchingQuantity[];
  cut?: number;
  totalSaree?: number;
  totalMeters?: number;

  // For Taka and Saree
  quantityType?: "Saree" | "Taka" | "Meter";
  quantity?: number;
  dispatchedQuantity?: number; // Track dispatched quantity for Taka

  // Common
  rate: number;
  orderValue: number;
}

export interface Order {
  id: string;
  orderNo: string;
  date: string;
  partyId: string | Party;
  factoryId?: string | Factory;
  brokerId?: string | Broker;
  salesmanId?: string | Salesman;
  paymentTerms?: string;
  deliveryTerms?: string;
  remarks?: string;
  status: "pending" | "completed"; // Added status
  dispatchStatus?: "pending" | "partial" | "completed"; // Dispatch status
  lineItems: OrderLineItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}
