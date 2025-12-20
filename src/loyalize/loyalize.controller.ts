import { Controller } from '@nestjs/common';
import { LoyalizeService } from './loyalize.service';

@Controller(`loyalize`)
export class LoyalizeController {
  constructor(private readonly loyalizeService: LoyalizeService) {}
}
