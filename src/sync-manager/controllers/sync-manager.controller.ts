import {
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { SyncManagerService } from '../providers/sync-manager.provider';

@Controller(`sync`)
export class SyncManagerController {
  constructor(protected syncManager: SyncManagerService) {}

  @Post(`metrics/:uuid/recalculate`)
  async recalculateMetricsByUuid(
    @Param(`uuid`, new ParseUUIDPipe()) uuid: string,
  ) {
    try {
      const { user, metrics } = await this.syncManager.runMetricsByUuid(uuid);
      return {
        status: 200,
        message: `Metrics recalculated for user ${user.firstName} ${user.lastName} - ID: ${user.numericId} - UUID: ${user.wellfoldId}`,
        data: { user, metrics },
      };
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new InternalServerErrorException({
        message: `Failed to recalculate metrics`,
        cause: e instanceof Error ? e.message : e,
      });
    }
  }

  @Get(`metrics/:uuid`)
  async getMetricsByUuid(@Param(`uuid`, new ParseUUIDPipe()) uuid: string) {
    try {
      const { user, metrics } = await this.syncManager.getMetricsByUuid(uuid);
      return {
        status: 200,
        message: `Metrics returned for user ${user.firstName} ${user.lastName} - ID: ${user.numericId} - UUID: ${user.wellfoldId}`,
        data: { user, metrics },
      };
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new InternalServerErrorException({
        message: `Failed to get metrics`,
        cause: e instanceof Error ? e.message : e,
      });
    }
  }
}
