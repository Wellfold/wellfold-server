// twilio-client.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwilioService } from 'nestjs-twilio';
import { ENV__TWILIO_FROM_NUMBER } from '../constants';

@Injectable()
export class SmsService {
  private fromNumber: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly twilioService: TwilioService,
  ) {
    this.fromNumber = this.configService.get<string>(ENV__TWILIO_FROM_NUMBER);
  }

  protected normalizePhoneNumber(phoneNumber: string): string {
    const digits = phoneNumber.replace(/\D/g, ``);

    // If already includes country code (e.g. 15555555555)
    if (digits.length === 11 && digits.startsWith(`1`)) {
      return `+${digits}`;
    }

    // If 10-digit US number
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    throw new Error(`Invalid phone number format: ${phoneNumber}`);
  }

  async sendMessage(phoneNumber: string, body: string) {
    return await this.twilioService.client.messages.create({
      to: this.normalizePhoneNumber(phoneNumber),
      from: this.fromNumber,
      body,
    });
  }
}
