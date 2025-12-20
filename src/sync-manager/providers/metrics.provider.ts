// [x] Loop through members
// [x] Get transactions by member
// [x] Sum them all, for iniital #
// Save that in a prop on the user

import { Member, Transaction } from '@/common/entities';
import { DatabaseService } from '@/common/providers/database.service';
import { Injectable } from '@nestjs/common';

// Later -- further process GMV
// -- adjust by program
// -- adjust by redemption

@Injectable()
export class MetricsService {
  constructor(protected database: DatabaseService) {}
  async calculateGmvAndRewards(member: Member) {
    const transactions = await this.database.getByProperty(
      Transaction,
      `oliveMemberId`,
      member.externalUuid,
    );
    const gmv = transactions.reduce((sum: number, tx) => {
      if (tx.isRedemption) return sum;
      return sum + (Number(tx.roundedAmount) || 0);
    }, 0);
    const rewards = transactions.reduce((sum: number, tx) => {
      if (tx.isRedemption) return sum;
      return sum + (Number(tx.reward.rewardAmount) || 0);
    }, 0);
    return {
      totalGmv: gmv,
      // according to the code, this is how it should operate...
      // line 35 of `lib/metrics-calculator.ts`
      qualifiedGmv: gmv,
      rewards: rewards,
    };
  }
}
