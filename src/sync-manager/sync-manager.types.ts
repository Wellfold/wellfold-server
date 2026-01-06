import { Promotion } from '@/common/entities';

export type PromotionProgressItem = {
  promotion: Promotion;
  promotionTerm: string;
  capType: string;
  rewardSum: number;
};
