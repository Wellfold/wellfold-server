import { Body, Controller, Post } from '@nestjs/common';
import { UserLifecycleService } from './user-lifecycle.service';

@Controller(`user-lifecycle`)
export class UserLifecycleController {
  constructor(private readonly userLifecycle: UserLifecycleService) {}

  @Post(`text-website`)
  async textWebsite(@Body() payload: { phoneNumber: string }) {
    const data = await this.userLifecycle.textWebsiteAfterInterest(
      payload.phoneNumber,
    );
    return {
      success: true,
      message: `Website sent after interest.`,
      data,
    };
  }
}
