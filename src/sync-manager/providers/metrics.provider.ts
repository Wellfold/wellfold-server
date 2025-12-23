import { UtilityService } from '@/common/providers/utility.service';

import { Member, Program, Promotion, Transaction } from '@/common/entities';
import { DatabaseService } from '@/common/providers/database.service';
import { Injectable } from '@nestjs/common';

const PROGRAM_PROMOTION_LIMIT = 1000000; // Unlikely to be > 1 million programs
const DEFAULT_MONTHLY_PROMOTION_CAP = 10; // In dollars
const PROGRAM_PROMOTION_PULL_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour

@Injectable()
export class MetricsService {
  constructor(
    protected database: DatabaseService,
    protected utility: UtilityService,
  ) {
    this.init();
    setInterval(() => {
      this.init();
    }, PROGRAM_PROMOTION_PULL_INTERVAL);
  }
  protected programs: Program[];
  protected promotions: Promotion[];

  protected async init() {
    console.log(`Pulling new programs and promotions.`);
    this.programs = await this.database.getMany(
      Program,
      PROGRAM_PROMOTION_LIMIT,
      0,
      {},
      true,
    );
    this.promotions = await this.database.getMany(
      Promotion,
      PROGRAM_PROMOTION_LIMIT,
      0,
      {},
      true,
    );
  }

  constructMemberMetricEntities(
    member: Member,
    totalGmvValue: number,
    qualifiedGmvValue: number,
    rewardsValue: number,
  ) {
    const metrics = [
      { type: `total_gmv`, value: totalGmvValue },
      { type: `qualified_gmv`, value: qualifiedGmvValue },
      { type: `rewards`, value: rewardsValue },
    ];

    return metrics
      .map(({ type, value }) => ({
        member,
        type,
        value,
        uniqueMemberMetricId: `${member.wellfoldId}__${type}`,
      }))
      .map((metric) => {
        return {
          ...metric,
          value: Number.isNaN(metric.value) ? 0 : metric.value,
        };
      });
  }

  async calculateGmvAndRewards(member: Member) {
    const transactions = await this.getTransactions(member);
    const { qualifiedTransactions, promotionProgress } =
      this.getPromotionProgressAndQualifiedTransactions(member, transactions);
    return {
      totalGmv: await this.getTotalGmv(transactions),
      qualifiedGmv: await this.getQualifiedGmv(qualifiedTransactions),
      rewards: await this.getRewardsBalance(promotionProgress, transactions),
      qualifiedTransactionsArray: qualifiedTransactions.map(
        (transactionWrapper) => {
          return {
            ...transactionWrapper.transaction,
            wellfoldCalculatedReward: transactionWrapper.calculatedReward,
          };
        },
      ),
    };
  }

  async getTransactions(member: Member) {
    const transactionsOlive = await this.database.getByProperty(
      Transaction,
      `oliveMemberId`,
      member.externalUuid,
    );
    const transactionsLoyalize = await this.database.getByProperty(
      Transaction,
      `loyalizeShopperId`,
      member.wellfoldId,
    );
    return [...transactionsOlive, ...transactionsLoyalize];
  }

  async getQualifiedGmv(
    qualifiedTransactions: {
      transaction: Transaction;
      applicablePromotion: Promotion;
      calculatedReward: number;
    }[],
  ) {
    return qualifiedTransactions.reduce(
      (sum: number, qualifiedTransactionDatum) => {
        return sum + Number(qualifiedTransactionDatum.transaction.amount);
      },
      0,
    );
  }

  async getTotalGmv(transactions: Transaction[]) {
    return transactions.reduce((sum: number, transaction) => {
      if (transaction.isRedemption) return sum;
      return (
        sum +
        (this.utility.convertRoundedAmountIntoAmount(
          Number(transaction.roundedAmount),
        ) || 0)
      );
    }, 0);
  }

  protected getPromotionProgressAndQualifiedTransactions(
    member: Member,
    transactions: Transaction[],
  ) {
    const qualifiedTransactions: {
      transaction: Transaction;
      applicablePromotion: Promotion;
      calculatedReward: number;
    }[] = [];

    const promotionProgressMap = new Map<
      string,
      {
        promotion: Promotion;
        month: string;
        rewardSum: number;
      }
    >();

    // Find promotions that apply to member
    const memberPromotions = this.getMemberPromotions(member);

    for (const transaction of transactions) {
      // Skip redemptions or already-rewarded transactions
      if (transaction.isRedemption || transaction.rewardAmount) continue;

      // Get transaction date and month
      const transactionDate = transaction.created;
      const month = `${transactionDate.getFullYear()}${String(
        transactionDate.getMonth() + 1,
      ).padStart(2, `0`)}`; // `202511`

      // Find first applicable promotion, don't do anything if none
      const applicablePromotion = memberPromotions.find(
        (promotion) =>
          promotion.mccCodes.includes(transaction.merchantCategoryCode) &&
          promotion.startDate.getTime() <= transactionDate.getTime() &&
          promotion.endDate.getTime() >= transactionDate.getTime(),
      );
      if (!applicablePromotion) continue;

      // Calculate possible reward
      const transactionAmount = Number(transaction.amount);
      const promotionPercent = Number(applicablePromotion.value);
      // TODO - Consider a future where promotion type is not percent
      const possibleRewardFromTransaction =
        transactionAmount * (promotionPercent / 100);

      // Unique key/storage for promotion+month combination
      const promotionProgressKey = `${applicablePromotion.id}__${month}`;
      const promotionProgressItem =
        promotionProgressMap.get(promotionProgressKey);

      // Get previous reward sum
      const previousRewardSum = promotionProgressItem?.rewardSum ?? 0;

      // Get promotion cap
      const promotionCap = Number(
        applicablePromotion.maxValue ?? DEFAULT_MONTHLY_PROMOTION_CAP,
      );

      const newRewardSum = Math.min(
        promotionCap,
        previousRewardSum + possibleRewardFromTransaction,
      );

      // Update promotion progress
      promotionProgressMap.set(promotionProgressKey, {
        promotion: applicablePromotion,
        month,
        rewardSum: newRewardSum,
      });

      // Calculate transaction-specific reward
      const calculatedRewardForTransaction = newRewardSum - previousRewardSum;

      // Add to qualified transactions
      qualifiedTransactions.push({
        transaction,
        applicablePromotion,
        calculatedReward: calculatedRewardForTransaction,
      });
    }

    return {
      promotionProgress: Array.from(promotionProgressMap.values()),
      qualifiedTransactions,
    };
  }

  getRewardsBalance(
    promotionProgress: {
      promotion: Promotion;
      month: string;
      rewardSum: number;
    }[],
    allTransactions: Transaction[],
  ): number {
    // Sum promotion progress month sum to get total Wellfold rewards.
    const wfRewardBalance: number = promotionProgress.reduce(
      (sum, obj) => sum + obj.rewardSum,
      0,
    );
    // Sum Olive & Loyalize rewards, which are separate.
    const oliveLoyalizeRewardBalance = allTransactions.reduce(
      (oliveLoyalizeRewardsSum: number, transaction) => {
        return oliveLoyalizeRewardsSum + Number(transaction.rewardAmount);
      },
      0,
    );

    return wfRewardBalance + oliveLoyalizeRewardBalance;
  }

  /**
   * TODO - In the future, consider the situation where 1 member is part of multiple programs
   */
  getMemberPromotions(member: Member) {
    return this.promotions.filter(
      (promotion) => promotion.programId === member.programId,
    );
  }

  getMemberMerchantCategoryCodeList(member: Member) {
    return this.getMemberPromotions(member).reduce(
      (list: number[], promotion) => {
        const promotionMccCodes = promotion.mccCodes ?? [];
        promotionMccCodes.forEach((code: number) => {
          if (!list.includes(code)) {
            list.push(code);
          }
        });
        return list;
      },
      [],
    );
  }
}
