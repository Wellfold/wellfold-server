import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilityService {
  buildOliveQuery(params: Record<string, string>): string {
    return Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join(`&`);
  }

  convertRoundedAmountIntoAmount(roundedAmount: number | string) {
    return Number((Number(roundedAmount) / 0.05).toFixed(2));
  }
}
