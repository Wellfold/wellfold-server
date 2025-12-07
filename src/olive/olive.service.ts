import { ENV__OLIVE_API_KEY } from '@/common/constants';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { OliveApiResponse } from './olive.types';

const OLIVE_API_BASE_URL = `https://api.oliveltd.com/v1`;

@Injectable()
export class OliveService {
  constructor(protected http: HttpService, protected config: ConfigService) {}
  protected getConfig() {
    return {
      headers: {
        accept: `application/json`,
        'Content-Type': `application/json`,
        'Olive-Key': this.config.get(ENV__OLIVE_API_KEY),
      },
    };
  }
  async pullTransactions() {
    //
  }
  async pullMembers(
    pageSize = 1000,
    pageNumber?: number,
  ): Promise<OliveApiResponse> {
    const apiName = `members`;

    const params = new URLSearchParams({
      pageSize: `${pageSize}`,
      pageNumber: pageNumber ? `${pageNumber}` : `0`,
      sort: `created:asc`,
    });

    const url = `${OLIVE_API_BASE_URL}/${apiName}?${params.toString()}`;

    return (await lastValueFrom(
      this.http.get<OliveApiResponse>(url, this.getConfig()),
    )) as unknown as OliveApiResponse;
  }

  test(): string {
    return `Hello World!`;
  }
}
