import { ENV__OLIVE_API_KEY, ENV__OLIVE_CLIENT_ID } from '@/common/constants';
import { Member } from '@/common/entities';
import { DatabaseService } from '@/common/providers/database.service';
import { UtilityService } from '@/common/providers/utility.service';
import {
  GenericApiResponse,
  TransactionsPuller,
} from '@/common/types/common.types';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { OliveRecordType } from './olive.types';

const OLIVE_API_BASE_URL = `https://api.oliveltd.com/v1`;
const CREATED_SINCE = `gt:2025-07-01T00:00:00Z`;
@Injectable()
export class OliveService implements TransactionsPuller {
  constructor(
    protected http: HttpService,
    protected config: ConfigService,
    protected utility: UtilityService,
    protected database: DatabaseService,
  ) {}
  protected getConfig() {
    return {
      headers: {
        accept: `application/json`,
        'Content-Type': `application/json`,
        'Olive-Key': this.config.get(ENV__OLIVE_API_KEY),
      },
    };
  }
  async pullTransactions(
    pageSize = 1000,
    pageNumber = 1,
  ): Promise<GenericApiResponse> {
    const results = await this.pullRecords(
      `transactions`,
      pageSize,
      pageNumber,
      {
        clientId: this.config.get(ENV__OLIVE_CLIENT_ID),
      },
    );
    const memberIdList = results.items.map((item) => item.memberId);
    const memberList = await this.database.getByProperty(
      Member,
      `externalUuid`,
      memberIdList,
    );
    return {
      ...results,
      items: results.items.map((item) => {
        return {
          ...item,
          oliveMemberId: item.memberId,
          amount: this.utility.convertRoundedAmountIntoAmount(
            item.roundedAmount,
          ),
          member: memberList.find(
            (member) => item.memberId === member.externalUuid,
          ),
        };
      }),
    };
  }

  async pullCards(
    pageSize = 1000,
    pageNumber?: number,
  ): Promise<GenericApiResponse> {
    return await this.pullRecords(`cards`, pageSize, pageNumber);
  }

  async pullMembers(
    pageSize = 1000,
    pageNumber?: number,
  ): Promise<GenericApiResponse> {
    return await this.pullRecords(`members`, pageSize, pageNumber);
  }

  async pullRecords(
    recordType: OliveRecordType,
    pageSize = 1000,
    pageNumber = 1,
    additionalParams?: any,
  ): Promise<GenericApiResponse> {
    const params = this.utility.buildOliveQuery({
      pageNumber: `${pageNumber}`,
      pageSize: `${pageSize}`,
      sort: `created:asc`,
      created: CREATED_SINCE,
      ...(additionalParams && { ...additionalParams }),
    });
    const url = `${OLIVE_API_BASE_URL}/${recordType}?${params}`;
    console.log({ url });
    return (await lastValueFrom(
      this.http.get<GenericApiResponse>(url, this.getConfig()),
    )) as unknown as GenericApiResponse;
  }
}
