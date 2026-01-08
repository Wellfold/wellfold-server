export interface HasExternalUuid {
  externalUuid?: string;
}

export interface HasInternalCreatedUpdated {
  createdInternally: Date;
  updatedInternally: Date;
}

export interface TransactionsPuller {
  pullTransactions: (pageSize: number, pageNumber: number) => Promise<any>;
}

export type ThirdPartyOrigin = `olive` | `loyalize`;

export type GenericApiResponse = {
  totalNumberOfPages: number;
  totalNumberOfRecords: number;
  items: any[];
};

export type PromotionCapType = `monthly` | `quarterly` | `yearly`;
