// sms.service.ts
import { ENV__WEBSITE_URL } from '@/common/constants';
import { SmsService } from '@/common/providers';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserLifecycleService {
  constructor(
    private readonly sms: SmsService,
    private readonly configService: ConfigService,
  ) {}

  async textWebsiteAfterInterest(phoneNumber: string) {
    const websiteUrl = this.configService.get(ENV__WEBSITE_URL);
    const body = `Welcome to Wellfold! Check out our website here: ${websiteUrl}`;

    const result = await this.sms.sendMessage(phoneNumber, body);
    console.log({ result });
    return result;
  }
}
