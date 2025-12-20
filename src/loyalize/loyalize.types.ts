export type LoyalizeTransactionApiItem = {
  id: number;
  sid: string;
  shopperId: string;
  storeId: number;
  storeName: string;
  orderNumber: string;
  status: string;
  currency: string;
  saleAmount: number;
  shopperCommission: number;
  tier?: string;
  purchaseDate: string;
  pendingDate?: string | null;
  availabilityDate?: string | null;
  paymentDate?: string | null;
  adminComment?: string | null;
  lastUpdate: string;
};

export type LoyalizeTransactionApiResponse = {
  content: LoyalizeTransactionApiItem[];
  totalPages: number;
  totalElements: number;
};
