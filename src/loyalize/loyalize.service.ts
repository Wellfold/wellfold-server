import { ENV__LOYALIZE_API_KEY } from '@/common/constants';
import { UtilityService } from '@/common/providers/utility.service';
import { GenericApiResponse } from '@/common/types/common.types';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { URLSearchParams } from 'url';
import { LoyalizeTransactionApiItem } from './loyalize.types';

const LOYALIZE_API_BASE_URL = `https://api.loyalize.com/v2`;

@Injectable()
export class LoyalizeService {
  constructor(
    protected http: HttpService,
    protected config: ConfigService,
    protected utility: UtilityService,
  ) {}

  protected getConfig() {
    return {
      headers: {
        accept: `application/json`,
        'Content-Type': `application/json`,
        Authorization: this.config.get(ENV__LOYALIZE_API_KEY),
      },
    };
  }

  async pullTransactions(
    pageSize = 1000,
    pageNumber = 1,
  ): Promise<GenericApiResponse> {
    const params = new URLSearchParams({
      size: `${pageSize}`,
      page: `${pageNumber - 1}`,
    });
    const url = `${LOYALIZE_API_BASE_URL}/transactions?${params.toString()}`;
    console.log({ url });
    const response: any = await lastValueFrom(
      this.http.get(url, this.getConfig()),
    );

    const result = {
      totalNumberOfPages: response.totalPages ?? 0,
      totalNumberOfRecords: response.totalElements ?? 0,
      items: response?.content
        ? response.content.map((item) =>
            this.mapLoyalizeTransactionToGeneric(item),
          )
        : [],
    } as GenericApiResponse;
    return result;
  }

  protected mapLoyalizeTransactionToGeneric(
    item: LoyalizeTransactionApiItem,
  ): any {
    const settlementDate = item.paymentDate ? new Date(item.paymentDate) : null;

    return {
      // --- Identity / upsert keys ---
      id: String(item.id),

      // --- Ownership ---
      loyalizeShopperId: item.shopperId,
      storeId: String(item.storeId),
      storeName: item.storeName,

      // --- Commercials ---
      currencyCode: item.currency,
      amount: Number(item.saleAmount ?? 0).toFixed(2),
      rewardAmount: Number(item.shopperCommission ?? 0).toFixed(2),

      // --- Dates ---
      created: new Date(item.purchaseDate),
      pendingDate: item.pendingDate ? new Date(item.pendingDate) : null,
      availabilityDate: item.availabilityDate
        ? new Date(item.availabilityDate)
        : null,
      settlementDate,

      // --- Status ---
      status: item.status,
      settled: Boolean(item.status === `COMPLETED`),

      // --- Metadata ---
      orderNumber: item.orderNumber,
      tier: item.tier ?? null,
      adminComment: item.adminComment ?? null,
    };
  }
}
