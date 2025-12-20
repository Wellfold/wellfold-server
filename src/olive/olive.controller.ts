import { Controller } from '@nestjs/common';
import { OliveService } from './olive.service';

@Controller(`olive`)
export class OliveController {
  constructor(private readonly oliveService: OliveService) {}
}
