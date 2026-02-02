import { UtilityService } from '@/common/providers/utility.service';
import { Presets, SingleBar } from 'cli-progress';

import { UserMetricEnum } from '@/common/constants';
import {
  ManualAdjustment,
  Member,
  MemberMetric,
  Program,
  Promotion,
  Redemption,
  Transaction,
  UserPromotionStatus,
} from '@/common/entities';
import { DatabaseService } from '@/common/providers/database.service';
import { Injectable } from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import { PromotionProgressItem, UserMetricsItem } from '../sync-manager.types';

const PROGRAM_PROMOTION_LIMIT = 1000000; // Unlikely to be > 1 million programs
const DEFAULT_MONTHLY_PROMOTION_CAP = 10; // In dollars
const PROGRAM_PROMOTION_PULL_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
const ADJUSTMENT_PULL_INTERVAL = 5 * 60 * 1000; // 5 minutes

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
  protected adjustments: ManualAdjustment[];
  protected adjustmentsLastPull: Date;

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

  protected async getManualAdjustments() {
    if (
      this.adjustments &&
      this.adjustmentsLastPull &&
      Date.now() < this.adjustmentsLastPull.getTime() + ADJUSTMENT_PULL_INTERVAL
    ) {
      return this.adjustments;
    }

    try {
      const allAdjustments = await this.database.getMany(
        ManualAdjustment,
        undefined,
        undefined,
        undefined,
        undefined,
        { user: true },
      );
      this.adjustmentsLastPull = new Date();
      return allAdjustments;
    } catch (e) {
      console.error(e);
    }
  }

  async constructMemberMetricEntities(
    member: Member,
    totalGmvValue: number | string,
    qualifiedGmvValue: number | string,
    totalRewardsValue: number | string,
  ) {
    const adjustments = await this.getManualAdjustments();
    const metrics: { type: UserMetricEnum; value: number | string }[] = [
      { type: UserMetricEnum.TOTAL_GMV, value: totalGmvValue },
      { type: UserMetricEnum.QUALIFIED_GMV, value: qualifiedGmvValue },
      { type: UserMetricEnum.TOTAL_REWARDS, value: totalRewardsValue },
      { type: UserMetricEnum.REWARDS_BALANCE, value: 0 },
    ];
    const redemptionsMetric = await this.getRedemptionMetricPerUser(member);
    const transformedMetrics = metrics
      .map(({ type, value }) => ({
        member,
        type,
        value,
        uniqueMemberMetricId: this.getUniqueUserMetricId(member, type),
      }))
      .map((metric) => {
        return {
          ...metric,
          value: Number.isNaN(metric.value) ? 0 : metric.value,
        };
      })
      .map((metric) => {
        const foundAdjustment = adjustments.find(
          (item) =>
            item.user.numericId === member.numericId &&
            item.type === metric.type,
        );
        return {
          ...metric,
          value: foundAdjustment
            ? Number(metric.value) + Number(foundAdjustment.adjustmentAmount)
            : metric.value,
        };
      });
    transformedMetrics.push(redemptionsMetric);
    return transformedMetrics;
  }

  protected getUniqueUserMetricId(user: Member, type: string) {
    return `${user.wellfoldId}__${type}`;
  }

  async calculateAndSaveMetrics(usersToFilterBy?: Member[]) {
    const userMetrics = new Map<number, UserMetricsItem>();
    const batchSize = 50;
    let transactionResaveBuffer: Transaction[] = [];
    const saveBatchSize = 50;
    const total = await this.database.countBy(
      Transaction,
      usersToFilterBy
        ? {
            member: {
              numericId: In(usersToFilterBy.map((user) => user.numericId)),
            },
          }
        : {},
    );

    const bar = new SingleBar(
      {
        format: `Calculating GMV & Rewards metrics based on all transactions |{bar}| {value}/{total} ({percentage}%)`,
      },
      Presets.shades_classic,
    );

    bar.start(total, 0);

    const getOrInitUserMetrics = (userId: number): UserMetricsItem => {
      let item = userMetrics.get(userId);
      if (!item) {
        item = {
          userId,
          promotionProgress: new Map(),
          metrics: {
            totalGmv: 0,
            qualifiedGmv: 0,
            cumulativeRewards: 0,
            externalRewards: 0,
          },
        };
        userMetrics.set(userId, item);
      }
      return item;
    };

    const getPromotionTerm = (
      date: Date,
      capType: `monthly` | `quarterly` | `yearly`,
    ) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, `0`);
      const quarter = Math.floor(date.getMonth() / 3) + 1;

      switch (capType) {
        case `monthly`:
          return `${year}${month}`;
        case `quarterly`:
          return `${year}Q${quarter}`;
        case `yearly`:
          return `${year}`;
      }
    };

    let offset = 0;
    // Process transactions, break when no more transactions to process
    while (true) {
      const transactions = await this.database.getMany(
        Transaction,
        batchSize,
        offset,
        usersToFilterBy
          ? {
              member: {
                numericId: In(usersToFilterBy.map((user) => user.numericId)),
              },
            }
          : {},
        { created: `ASC` },
        { member: true },
      );

      if (!transactions.length) break;

      for (const transaction of transactions) {
        bar.increment();

        if (transaction.isRedemption) continue;

        const user = transaction.member;
        if (!user) continue;

        const metricsItem = getOrInitUserMetrics(user.numericId);

        // External rewards (already calculated)
        if (transaction.rewardAmount) {
          metricsItem.metrics.externalRewards += Number(
            transaction.rewardAmount,
          );
          continue;
        }

        // Total GMV (non-loyalize only)
        if (transaction.thirdPartyOrigin !== `loyalize`) {
          metricsItem.metrics.totalGmv += Number(transaction.amount);
        }

        // Find the first applicable promotion
        const promotions = this.getMemberPromotions(user);
        if (!promotions.length) continue;

        const txDate = transaction.created;

        const promotion = promotions.find(
          (p) =>
            p.mccCodes.includes(transaction.merchantCategoryCode) &&
            p.startDate <= txDate &&
            p.endDate >= txDate,
        );

        if (!promotion) continue;

        const amount = Number(transaction.amount);
        const percent = Number(promotion.value);
        const potentialReward = amount * (percent / 100);

        const capType = promotion.capType ?? `monthly`;
        const term = getPromotionTerm(txDate, capType);

        const progressKey = `${promotion.id}__${term}`;
        const progress =
          metricsItem.promotionProgress.get(progressKey)?.rewardSum ?? 0;

        const cap = Number(promotion.maxValue ?? DEFAULT_MONTHLY_PROMOTION_CAP);
        // Most important line
        const newRewardSum = Math.min(cap, progress + potentialReward);
        const calculatedReward = newRewardSum - progress;

        metricsItem.promotionProgress.set(progressKey, {
          promotion,
          promotionTerm: term,
          capType,
          rewardSum: newRewardSum,
        });

        metricsItem.metrics.qualifiedGmv += amount;
        metricsItem.metrics.cumulativeRewards += calculatedReward;

        transactionResaveBuffer.push({
          ...transaction,
          wellfoldCalculatedReward: calculatedReward.toString(),
        });
      }

      if (transactionResaveBuffer.length >= saveBatchSize) {
        await this.database.upsertMany(Transaction, transactionResaveBuffer);
        transactionResaveBuffer = [];
      }

      offset += batchSize;
    }

    bar.stop();

    if (transactionResaveBuffer.length) {
      await this.database.upsertMany(Transaction, transactionResaveBuffer);
    }

    const metricsBar = new SingleBar(
      {
        format: `Saving metric entities across users |{bar}| {value}/{total} ({percentage}%)`,
      },
      Presets.shades_classic,
    );

    // Existing metrics
    const userMetricsList = Array.from(userMetrics.values());

    const allUserIds = (
      await this.database.getPropertyValues(Member, `numericId`)
    ).filter((userId) =>
      usersToFilterBy
        ? usersToFilterBy.map((user) => user.numericId).includes(userId)
        : true,
    );

    const metricsUserIdSet = new Set(
      userMetricsList.map((m) => String(m.userId)),
    );

    const nullUserIds = allUserIds.filter(
      (id) => !metricsUserIdSet.has(String(id)),
    );

    const allWork: {
      userId: number;
      metrics: {
        totalGmv: number;
        qualifiedGmv: number;
        cumulativeRewards: number;
        externalRewards: number;
      };
      promotionProgress: Map<string, PromotionProgressItem> | null;
    }[] = [
      ...userMetricsList.map((userMetricsItem) => ({
        userId: userMetricsItem.userId,
        metrics: userMetricsItem.metrics,
        promotionProgress: userMetricsItem.promotionProgress,
      })),
      ...nullUserIds.map((id) => ({
        userId: id,
        metrics: {
          totalGmv: 0,
          qualifiedGmv: 0,
          cumulativeRewards: 0,
          externalRewards: 0,
        },
        promotionProgress: null,
      })),
    ];

    metricsBar.start(allWork.length, 0);

    const BATCH_SIZE = 100;
    let saveBatch = [];
    let userPromotionStatusSaveBatch = [];
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
        const progressAcrossPromotions = Array.from(
          item.promotionProgress?.values() ?? [],
        );
        const userPromotionStatusList = progressAcrossPromotions.map(
          (progressItem) => {
            const { promotion } = progressItem;
            return {
              user: member,
              uniquePromotionUserId: `promotion__${promotion.id}__user__${member.numericId}`,
              promotion,
              hasHitCap: Number(promotion.maxValue) <= progressItem.rewardSum,
            };
          },
        );
        userPromotionStatusSaveBatch.push(...userPromotionStatusList);

        const entities = await this.constructMemberMetricEntities(
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
        await this.database.upsertMany(
          UserPromotionStatus,
          userPromotionStatusSaveBatch,
          `uniquePromotionUserId`,
        );
        saveBatch = [];
        userPromotionStatusSaveBatch = [];
      }
    }

    // Final flush
    if (saveBatch.length) {
      await this.database.upsertMany(
        MemberMetric,
        saveBatch,
        `uniqueMemberMetricId`,
      );
      await this.database.upsertMany(
        UserPromotionStatus,
        userPromotionStatusSaveBatch,
        `uniquePromotionUserId`,
      );
    }

    metricsBar.stop();
  }

  async getRedemptionMetricPerUser(user: Member) {
    const redemptionList = await this.database.getByProperty(
      Redemption,
      `memberId`,
      user.externalUuid,
    );
    return {
      member: user,
      type: UserMetricEnum.TOTAL_REDEMPTIONS,
      value: redemptionList.reduce(
        (sum, redemption) => sum + Number(redemption.amount),
        0,
      ),
      uniqueMemberMetricId: `${user.wellfoldId}__total_redemptions`,
    };
  }

  async resaveRedemptionsWithUserIdAndProgramId() {
    console.log(`Resaving redemptions with user ID and program ID.`);
    const total = await this.database.countBy(Redemption, {
      member: IsNull(),
    });
    const bar = new SingleBar(
      {
        format: `Resaving redemptions with user ID and program ID |{bar}| {value}/{total} ({percentage}%)`,
      },
      Presets.shades_classic,
    );
    bar.start(total, 0);
    let offset = 0;
    let hasMore = true;
    const batchSize = 100;
    const redemptionsToSaveLimit = 100;
    let redemptionsToSave = [];
    while (hasMore) {
      const redemptionBatch = await this.database.getMany(
        Redemption,
        batchSize,
        offset,
        {},
        { createdAt: `ASC` },
      );
      if (!redemptionBatch?.length) break;
      for (const redemption of redemptionBatch) {
        bar.increment();
        const userList = await this.database.getByProperty(
          Member,
          `externalUuid`,
          redemption.memberId,
        );
        if (!userList.length) continue;
        const user = userList[0];
        const program = this.programs.find(
          (item) =>
            item?.name.toLowerCase() === redemption?.programName.toLowerCase(),
        );

        redemptionsToSave.push({
          ...redemption,
          member: user,
          programId: program?.programId,
        });
        if (redemptionsToSave.length >= redemptionsToSaveLimit) {
          await this.database.upsertMany(Redemption, redemptionsToSave, `id`);
          redemptionsToSave = [];
        }
      }
      if (redemptionsToSave.length) {
        await this.database.upsertMany(Redemption, redemptionsToSave, `id`);
        redemptionsToSave = [];
      }
      offset += batchSize;
      hasMore = redemptionBatch.length === batchSize;
    }
    bar.stop();
  }

  async saveRewardsBalanceMetric(usersToFilterBy?: Member[]) {
    console.error({ usersToFilterBy });
    const saveBufferSize = 100;
    let saveBuffer = [];
    const allUserIds = (
      await this.database.getPropertyValues(Member, `numericId`)
    ).filter((userId) =>
      usersToFilterBy
        ? usersToFilterBy.map((user) => user.numericId).includes(userId)
        : true,
    );

    const allAdjustments = await this.getManualAdjustments();
    const bar = new SingleBar(
      {
        format: `Saving rewards balance metric for all users. |{bar}| {value}/{total} ({percentage}%)`,
      },
      Presets.shades_classic,
    );
    bar.start(allUserIds.length, 0);

    for (const userId of allUserIds) {
      bar.increment();
      const userList = await this.database.getByProperty(
        Member,
        `numericId`,
        userId,
      );
      const user = userList[0];
      if (!user) continue;
      const metricPayload = {
        member: user,
        type: UserMetricEnum.REWARDS_BALANCE,
        uniqueMemberMetricId: this.getUniqueUserMetricId(
          user,
          UserMetricEnum.REWARDS_BALANCE,
        ),
        value: 0,
      };
      const metricsList = await this.database.getMany(
        MemberMetric,
        Object.values(UserMetricEnum).length,
        undefined,
        {
          member: { numericId: user.numericId },
        },
      );
      const totalRewards = metricsList.find(
        (metric) => metric.type === `total_rewards`,
      );
      const totalRedemptions = metricsList.find(
        (metric) => metric.type === `total_redemptions`,
      );
      if (totalRewards && totalRedemptions) {
        // Find rewards balance adjustment (if any)
        const rewardsBalanceAdjustment = allAdjustments.find(
          (item) =>
            item.user.numericId === userId &&
            item.type === UserMetricEnum.REWARDS_BALANCE,
        );

        const rewards = Number(totalRewards.value);
        const redemptions = Number(totalRedemptions.value);
        const baseBalance = Math.max(rewards - redemptions, 0);
        const adjustment = rewardsBalanceAdjustment
          ? Number(rewardsBalanceAdjustment.adjustmentAmount)
          : 0;
        metricPayload.value = Math.max(baseBalance + adjustment, 0);
      }

      saveBuffer.push(metricPayload);
      if (saveBuffer.length >= saveBufferSize) {
        await this.database.upsertMany(
          MemberMetric,
          saveBuffer,
          `uniqueMemberMetricId`,
        );
        saveBuffer = [];
      }
    }
    if (saveBuffer.length) {
      await this.database.upsertMany(
        MemberMetric,
        saveBuffer,
        `uniqueMemberMetricId`,
      );
      saveBuffer = [];
    }
    bar.stop();
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
