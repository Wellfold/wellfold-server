import { Promotion } from '@/common/entities';

export type PromotionProgressItem = {
  promotion: Promotion;
  promotionTerm: string;
  capType: string;
  rewardSum: number;
};

export type UserMetricsItem = {
  userId: number;
  promotionProgress: Map<string, PromotionProgressItem>;
  metrics: {
    totalGmv: number;
    qualifiedGmv: number;
    cumulativeRewards: number;
    externalRewards: number;
  };
};
