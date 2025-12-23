import { UtilityService } from '@/common/providers/utility.service';

import { Member, Program, Promotion, Transaction } from '@/common/entities';
import { DatabaseService } from '@/common/providers/database.service';
import { Injectable } from '@nestjs/common';

const PROGRAM_PROMOTION_LIMIT = 1000000; // Unlikely to be > 1 million programs
const DEFAULT_MONTHLY_PROMOTION_LIMIT = 10; // In dollars
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
        return sum + qualifiedTransactionDatum.calculatedReward;
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
    const promotionProgressMap = new Map();
    const memberPromotions = this.getMemberPromotions(member);
    // Figure out Wellfold-specific rewards
    for (const transaction of transactions) {
      // Don't count redemptions or Olive rewards transactions (will add later)
      if (transaction.isRedemption || transaction.rewardAmount) continue;
      // Get transaction date & month
      const transactionDate = transaction.created;
      const month = `${transactionDate.getFullYear()}${String(
        transactionDate.getMonth() + 1,
      ).padStart(2, `0`)}`;
      // Find the first applicable promotion to this transaction
      const applicablePromotion = memberPromotions.find(
        (promotion) =>
          promotion.mccCodes.includes(transaction.merchantCategoryCode) &&
          promotion.startDate.getTime() <= transaction.created.getTime() &&
          promotion.endDate.getTime() >= transaction.created.getTime(),
      );
      if (!applicablePromotion) {
        continue;
      }

      // Calculate the *possible* reward from the transaction
      const possibleRewardFromTransaction =
        Number(transaction.amount) * (Number(applicablePromotion.value) / 100);
      // Get the collected promotion & previous WF rewards sum if it exists in the collection
      const pmCollectorKey = `${applicablePromotion.id}__${month}`;
      const collectedPmInfo = promotionProgressMap.get(pmCollectorKey);
      const previousRewardSum = collectedPmInfo?.sum ?? 0;
      const newRewardSum = Math.min(
        Number(applicablePromotion.maxValue ?? DEFAULT_MONTHLY_PROMOTION_LIMIT),
        collectedPmInfo?.sum + possibleRewardFromTransaction,
      );
      // Add to promotion progress map
      promotionProgressMap.set(pmCollectorKey, {
        promotion: applicablePromotion,
        month,
        rewardSum: newRewardSum,
      });
      // Add to transaction & transaction-specific rewards collector
      const calculatedRewardForTransaction = newRewardSum - previousRewardSum;
      qualifiedTransactions.push({
        transaction,
        applicablePromotion,
        calculatedReward: calculatedRewardForTransaction, // zero after reward is met
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
    // Sum olive rewards, which are separate.
    const oliveRewardBalance = allTransactions.reduce(
      (oliveRewardsSum: number, transaction) => {
        return oliveRewardsSum + Number(transaction.rewardAmount);
      },
      0,
    );

    return wfRewardBalance + oliveRewardBalance;
  }

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
