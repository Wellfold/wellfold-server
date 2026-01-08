import { UtilityService } from '@/common/providers/utility.service';
import { Presets, SingleBar } from 'cli-progress';

import {
  Member,
  MemberMetric,
  Program,
  Promotion,
  Transaction,
} from '@/common/entities';
import { DatabaseService } from '@/common/providers/database.service';
import { Injectable } from '@nestjs/common';
import { PromotionProgressItem } from '../sync-manager.types';

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
    try {
      this.programs = await this.database.getMany(
        Program,
        PROGRAM_PROMOTION_LIMIT,
        0,
        {},
      );
      this.promotions = await this.database.getMany(
        Promotion,
        PROGRAM_PROMOTION_LIMIT,
        0,
        {},
      );
    } catch (e) {
      console.error(e);
    }
  }

  constructMemberMetricEntities(
    member: Member,
    totalGmvValue: number | string,
    qualifiedGmvValue: number | string,
    rewardsValue: number | string,
  ) {
    const metrics = [
      { type: `total_gmv`, value: totalGmvValue },
      { type: `qualified_gmv`, value: qualifiedGmvValue },
      { type: `total_rewards`, value: rewardsValue },
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

  async calculateAndSaveMetrics() {
    const userMetrics = new Map<
      number,
      {
        userId: number;
        promotionProgress: Map<string, PromotionProgressItem>;
        metrics: {
          totalGmv: number;
          qualifiedGmv: number;
          cumulativeRewards: number;
          externalRewards: number;
        };
      }
    >();
    const batchSize = 50;
    const transactionSaveCollectionSize = 50;
    let transactionSaveCollection = [];
    const total = await this.database.count(Transaction);

    const bar = new SingleBar(
      {
        format: `Calculating GMV & Rewards metrics based on all transactions |{bar}| {value}/{total} ({percentage}%)`,
      },
      Presets.shades_classic,
    );

    bar.start(total, 0);
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const transactionBatch = await this.database.getMany(
        Transaction,
        batchSize,
        offset,
        {},
        { created: `ASC` },
        {
          member: true,
        },
      );

      if (!transactionBatch?.length) break;
      for (const transaction of transactionBatch) {
        bar.increment();
        // Skip redemptions
        if (transaction.isRedemption) continue;

        const user = transaction.member;

        if (!user) {
          continue;
        }

        const defaultUserMetricsItem = {
          userId: user.numericId,
          metrics: {
            totalGmv: 0,
            qualifiedGmv: 0,
            cumulativeRewards: 0,
            externalRewards: 0,
          },
          promotionProgress: new Map<string, PromotionProgressItem>(),
        };

        if (transaction.rewardAmount) {
          const userMetricsItem =
            userMetrics.get(user.numericId) ?? defaultUserMetricsItem;
          userMetrics.set(user.numericId, {
            ...userMetricsItem,
            metrics: {
              ...userMetricsItem.metrics,
              externalRewards:
                userMetricsItem.metrics.externalRewards +
                Number(transaction.rewardAmount),
            },
          });
          continue;
        }

        // Increment total GMV
        if (transaction.thirdPartyOrigin !== `loyalize`) {
          const userMetricsItem =
            userMetrics.get(user.numericId) ?? defaultUserMetricsItem;
          userMetrics.set(user.numericId, {
            ...userMetricsItem,
            metrics: {
              ...userMetricsItem.metrics,
              totalGmv:
                userMetricsItem.metrics.qualifiedGmv +
                Number(transaction.amount),
            },
          });
        }

        // Find first applicable promotion, don't do anything if none
        const transactionDate = transaction.created;
        const userPromotions = this.getMemberPromotions(user);
        const applicablePromotion = userPromotions.find(
          (promotion) =>
            promotion.mccCodes.includes(transaction.merchantCategoryCode) &&
            promotion.startDate.getTime() <= transactionDate.getTime() &&
            promotion.endDate.getTime() >= transactionDate.getTime(),
        );
        if (!applicablePromotion) continue;
        // Format transaction time options
        const yearAndMonth = `${transactionDate.getFullYear()}${String(
          transactionDate.getMonth() + 1,
        ).padStart(2, `0`)}`; // `202511`
        const year = transactionDate.getFullYear();
        const quarter = Math.floor(transactionDate.getMonth() / 3) + 1;
        const yearAndQuarter = `${year}Q${quarter}`; // `2025Q2`
        const transactionAmount = Number(transaction.amount);
        const promotionPercent = Number(applicablePromotion.value);
        // TODO - Consider a future where promotion type is not percent
        const possibleRewardFromTransaction =
          transactionAmount * (promotionPercent / 100);

        const userMetricsItem =
          userMetrics.get(user.numericId) ?? defaultUserMetricsItem;
        const { metrics, promotionProgress } = userMetricsItem;
        // Unique key/storage for promotion+promotion term combination
        const capType = applicablePromotion.capType ?? `monthly`;
        let promotionTerm = yearAndMonth;
        switch (capType) {
          case `monthly`:
            promotionTerm = yearAndMonth;
          case `quarterly`:
            promotionTerm = yearAndQuarter;
          case `yearly`:
            promotionTerm = `${year}`;
        }

        const promotionProgressKey = `${applicablePromotion.id}__${promotionTerm}`;
        const promotionProgressItem =
          promotionProgress.get(promotionProgressKey);

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
        promotionProgress.set(promotionProgressKey, {
          promotion: applicablePromotion,
          promotionTerm,
          capType,
          rewardSum: newRewardSum,
        });

        // Calculate transaction-specific reward
        const wellfoldCalculatedReward = newRewardSum - previousRewardSum;
        const newTransaction = {
          ...transaction,
          wellfoldCalculatedReward,
        };
        transactionSaveCollection.push(newTransaction);
        userMetrics.set(user.numericId, {
          ...userMetricsItem,
          metrics: {
            ...metrics,
            qualifiedGmv: metrics.qualifiedGmv + Number(transaction.amount),
            cumulativeRewards:
              metrics.cumulativeRewards + wellfoldCalculatedReward,
          },
          promotionProgress,
        });
      }
      if (transactionSaveCollection.length >= transactionSaveCollectionSize) {
        await this.database.upsertMany(Transaction, transactionSaveCollection);
        transactionSaveCollection = [];
      }
      offset += batchSize;
      hasMore = transactionBatch.length === batchSize;
    }
    bar.stop();
    if (transactionSaveCollection.length) {
      await this.database.upsertMany(Transaction, transactionSaveCollection);
      transactionSaveCollection = [];
    }

    const metricsBar = new SingleBar(
      {
        format: `Saving metric entities across users |{bar}| {value}/{total} ({percentage}%)`,
      },
      Presets.shades_classic,
    );

    // 1️⃣ Existing metrics
    const userMetricsList = Array.from(userMetrics.values());

    // 2️⃣ Pull ONLY numeric IDs (no entity hydration)
    const allUserIds = await this.database.getPropertyValues(
      Member,
      `numericId`,
    );

    // 3️⃣ Fast set math
    const metricsUserIdSet = new Set(
      userMetricsList.map((m) => String(m.userId)),
    );

    const nullUserIds = allUserIds.filter(
      (id) => !metricsUserIdSet.has(String(id)),
    );

    // 4️⃣ Combine workload
    const allWork = [
      ...userMetricsList.map((m) => ({
        userId: m.userId,
        metrics: m.metrics,
      })),
      ...nullUserIds.map((id) => ({
        userId: id,
        metrics: {
          totalGmv: 0,
          qualifiedGmv: 0,
          cumulativeRewards: 0,
          externalRewards: 0,
        },
      })),
    ];

    metricsBar.start(allWork.length, 0);

    // 5️⃣ Batch-safe processing
    const BATCH_SIZE = 100;
    let saveBatch = [];

    for (let i = 0; i < allWork.length; i += BATCH_SIZE) {
      const chunk = allWork.slice(i, i + BATCH_SIZE);

      // Fetch only needed users for this chunk
      const members = await this.database.getByProperty(
        Member,
        `numericId`,
        chunk.map((c) => c.userId),
      );

      const memberById = new Map(members.map((m) => [String(m.numericId), m]));

      for (const item of chunk) {
        const member = memberById.get(String(item.userId));
        if (!member) {
          metricsBar.increment();
          continue;
        }

        const { totalGmv, qualifiedGmv, cumulativeRewards, externalRewards } =
          item.metrics;

        const entities = this.constructMemberMetricEntities(
          member,
          totalGmv,
          qualifiedGmv,
          cumulativeRewards + externalRewards,
        );

        saveBatch.push(...entities);
        metricsBar.increment();
      }

      // Flush saves in controlled chunks
      if (saveBatch.length >= BATCH_SIZE) {
        await this.database.upsertMany(
          MemberMetric,
          saveBatch,
          `uniqueMemberMetricId`,
        );
        saveBatch = [];
      }
    }

    // Final flush
    if (saveBatch.length) {
      await this.database.upsertMany(
        MemberMetric,
        saveBatch,
        `uniqueMemberMetricId`,
      );
    }

    metricsBar.stop();
  }

  async getTransactions(member: Member) {
    const transactionsOlive = await this.database.getByProperty(
      Transaction,
      `oliveMemberId`,
      member.externalUuid,
      `created`,
    );
    const transactionsLoyalize = await this.database.getByProperty(
      Transaction,
      `loyalizeShopperId`,
      member.wellfoldId,
      `created`,
    );
    return [...transactionsOlive, ...transactionsLoyalize].sort(
      (a, b) => a.created.getTime() - b.created.getTime(),
    );
  }

  getRewardsBalance(
    promotionProgress: PromotionProgressItem[],
    allTransactions: Transaction[],
  ): number {
    // Sum promotion progress term sum to get total Wellfold rewards.
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
