import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Presets, SingleBar } from 'cli-progress';
import * as fs from 'fs';
import { Command, Console } from 'nestjs-console';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { ENV__OUTDATED_METRICS_URL } from '../constants';
import { Member, Program } from '../entities';
import { DatabaseService } from './database.service';

@Console()
export class OutdatedMetrics {
  constructor(
    protected database: DatabaseService,
    protected http: HttpService,
    protected config: ConfigService,
  ) {}

  @Command({
    command: `generate-outdated-metrics`,
    alias: `gom`,
  })
  async generateOutdatedMetrics() {
    const programs = await this.database.getMany(Program, 100, 0, {});
    const idList = await this.database.getPropertyValues(Member, `numericId`);
    idList.unshift(371);
    const limit = idList.length + 1;
    const bar = new SingleBar({}, Presets.shades_classic);
    bar.start(limit, 0);

    const rows: Array<{
      id: string | number;
      firstName: string;
      lastName: string;
      email: string;
      totalPendingRewards: number;
    }> = [];

    for (let i = 0; i < limit; i++) {
      const userList = await this.database.getByProperty(
        Member,
        `numericId`,
        idList[i],
      );
      const user = userList[0];

      const programName = programs.find(
        (p) => p.programId === user?.programId,
      )?.name;

      if (user && programName) {
        const params = new URLSearchParams({
          memberId: user.externalUuid,
          userId: user.wellfoldId,
          programName,
          withTransactions: `true`,
        });
        const baseUrl = this.config.get(ENV__OUTDATED_METRICS_URL);
        const url = `${baseUrl}?${params.toString()}`;
        try {
          const response: any = await lastValueFrom(this.http.get(url));
          rows.push({
            id: user.wellfoldId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            totalPendingRewards: response?.totalPendingRewards ?? 0,
          });
        } catch {}
      }

      bar.increment();
    }

    bar.stop();

    const csv =
      `id,firstName,lastName,email,totalPendingRewards\n` +
      rows
        .map(
          (r) =>
            `${r.id},${r.firstName},${r.lastName},${r.email},${r.totalPendingRewards}`,
        )
        .join(`\n`);

    const filePath = path.join(process.cwd(), `outdated-metrics.csv`);
    fs.writeFileSync(filePath, csv);
  }
}
