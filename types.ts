
export type UserRole = 'admin' | 'rca' | 'promoter';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
}

// Updated list of regions as requested
export const REGIONS = [
  'São Paulo',
  'SP Interior',
  'Sudeste',
  'Sul',
  'Centro Oeste',
  'Centro Norte',
  'Norte',
  'Nordeste',
  'Nordeste II',
  'RJ/ES',
  'GC',
  'Televendas',
  'Doces Tempos'
] as const;

export type Region = typeof REGIONS[number];

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'paid' | 'blocked_volume' | 'expired';

export interface ProductCount {
  name: string;
  qty: number;
}

export interface SalesReport {
  date: string; // ISO String
  storeName: string;
  sellerName: string; // Changed from sellerCode to sellerName
  products: ProductCount[];
}

export interface TradeRequest {
  id: string;
  requestType?: 'degustacao' | 'personalizacao'; // Novo tipo de Ação
  tradeCode?: string; // Unique ID (Ex: TJ-A1B2C3)
  uid: string;
  createdAt: number;
  
  // RCA Identity (Captured in Form)
  rcaEmail: string; 
  rcaName: string;
  rcaPhone: string;

  // Step 2 & 3 Data
  partnerCode: string;
  region: Region;
  orderDate?: string; // Data do Pedido (Sistema)
  dateOfAction: string; // Data da Ação (Execução)
  days: number;
  justification?: string;
  totalValue: number; // days * 150 (Hidden from RCA)
  
  // State
  status: RequestStatus;
  rejectionReason?: string;
  
  // Execution Phase
  salesReports?: SalesReport[];
  pixKey?: string;
  pixHolder?: string;
  pixCpf?: string;
  
  // Legacy single fields
  photoUrl?: string;
  receiptUrl?: string;

  // New Multiple Upload fields
  photoUrls?: string[];
  receiptUrls?: string[];

  // Customization Module fields
  customizationSpace?: string;
  brandCategory?: string;
  city?: string;
  supplierIndication?: string;
  spacePhotoUrl?: string;
  spacePhotoUrls?: string[];
  adminAssignedSupplier?: string;
}

export interface RegionalBudget {
  id: string; // Composite key: Region_Month (e.g., "Sul_2023-10")
  region: Region;
  month: string; // YYYY-MM
  limit: number;
}

export const PRODUCTS_LIST = [
  "Bala de Coco - 400g",
  "Bala de Coco - 700g",
  "Granolas - 250g",
  "Granolas - 500g",
  "Granolas - 750g",
  "Granola 1Kg",
  "Doce Zero/Whey",
  "Doce 400g",
  "Doce 1,1Kg",
  "Bisnaga 1,1Kg"
];

export const ADMIN_EMAILS = [
  'mateus.silva@junco.com.br',
  'cissia.sousa@junco.com.br'
];

export interface TradeShowcaseItem {
  id: string;
  imageUrl: string;
  partner: string;
  city: string;
  requiredValue: number;
  createdAt: number;
}

