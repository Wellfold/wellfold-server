// common/http-interceptor.provider.ts
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { AxiosError, AxiosResponse } from 'axios';

@Injectable()
export class HttpInterceptorProvider {
  constructor(private readonly http: HttpService) {
    this.http.axiosRef.interceptors.response.use(
      (response: AxiosResponse) => {
        return response.data;
      },

      (error: AxiosError) => {
        const status = error.response?.status ?? 502;
        const message =
          error.response?.data ?? error.message ?? `Upstream API error`;

        console.error(`HTTP Error [${status}]:`, message);

        // Wrap error consistently for Nest
        throw new HttpException(message, status);
      },
    );
  }
}
