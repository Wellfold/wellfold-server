import { Card, Member, Transaction } from '@/common/entities';
import { DatabaseService } from '@/common/providers/database.service';
import { HasExternalUuid, ThirdPartyOrigin } from '@/common/types/common.types';
import { LoyalizeService } from '@/loyalize/loyalize.service';
import { OliveService } from '@/olive/olive.service';
import { Command, Console } from 'nestjs-console';
import { DeepPartial } from 'typeorm';
import { MetricsService } from './metrics.provider';

@Console()
export class SyncManagerService {
  constructor(
    protected olive: OliveService,
    protected loyalize: LoyalizeService,
    protected database: DatabaseService,
    protected metrics: MetricsService,
  ) {}

  @Command({
    alias: `rii`,
    command: `run-initial-import`,
  })
  async runInitialImport() {
    try {
      await this.importMembers();
      await this.importCards();
      await this.importTransactions();
      await this.runMetrics();
      await this.setCardLinkDatesOnMembers();
      await this.handleRedemptions();
    } catch (e) {
      console.error(e);
    }
  }

  @Command({
    alias: `rm`,
    command: `run-metrics`,
  })
  async runMetrics() {
    try {
      await this.metrics.calculateAndSaveMetrics();
    } catch (e) {
      console.error(e);
    }
  }

  async setCardLinkDatesOnMembers() {
    console.log(`Syncing card link dates on members.`);
    const memberBatchSize = 250;
    let pageNumber = 1;

    try {
      while (true) {
        const memberList = await this.database.getMany(
          Member,
          memberBatchSize,
          memberBatchSize * pageNumber,
        );
        console.log(
          `Setting card link dates on page ${pageNumber}: ${
            memberList.length
          } ${Member.name.toLowerCase()}s`,
        );

        if (!memberList.length) break;
        const newMemberList = [];
        for (let i = 0; i < memberList.length; i++) {
          const member = memberList[i];
          const cardList = await this.database.getByProperty(
            Card,
            `memberId`,
            member.externalUuid,
          );

          const newMember: Member = {
            ...memberList[i],
            cardLinked: cardList.length > 0,
            cardLinkedDate:
              cardList.length > 0
                ? !member.cardLinked
                  ? new Date()
                  : member.cardLinkedDate
                : null,
          };
          newMemberList.push(newMember);
        }
        await this.database.upsertMany(Member, newMemberList);
        if (memberList.length < memberBatchSize) break;
        pageNumber++;
      }
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Generic method shared across objects
   *
   * Calls the given oliveFetcher(pageSize, pageNumber)
   * Applies chunking + mapping (externalUuid)
   * Upserts memberBatches into DB
   */
  private async importPaginated<
    TRecord extends { id: string },
    TEntity extends HasExternalUuid,
  >(
    fetcher: (
      pageSize: number,
      pageNumber: number,
    ) => Promise<{ items: TRecord[] }>,
    entityClass: new () => TEntity,
    thirdPartyOrigin: ThirdPartyOrigin,
  ): Promise<void> {
    const pageSize = 1000;
    const memberBatchSize = 250;
    let pageNumber = 1;

    try {
      while (true) {
        const { items } = await fetcher(pageSize, pageNumber);
        console.log(
          `Fetched page ${pageNumber}: ${
            items.length
          } ${entityClass.name.toLowerCase()}s`,
        );

        if (!items.length) break;

        for (let i = 0; i < items.length; i += memberBatchSize) {
          const chunk = items.slice(i, i + memberBatchSize);

          const mapped = chunk.map((record) => {
            const { id, ...rest } = record;
            return {
              externalUuid: id,
              thirdPartyOrigin,
              ...rest,
            } as unknown as DeepPartial<TEntity>;
          });
          console.log(
            `Upserting chunk ${i / memberBatchSize + 1} of ${Math.ceil(
              items.length / memberBatchSize,
            )}`,
          );

          await this.database.upsertMany(entityClass, mapped);
        }

        if (items.length < pageSize) break;
        pageNumber++;
      }
    } catch (e) {
      console.error(e);
    }

    console.log(`${entityClass.name} import completed.`);
  }

  /**
   * Import Members using shared logic
   */
  async importMembers(): Promise<void> {
    console.log(`Importing members from Olive.`);
    return this.importPaginated(
      (pageSize, pageNumber) => this.olive.pullMembers(pageSize, pageNumber),
      Member,
      `olive`,
    );
  }

  /**
   * Import Transactions using shared logic
   */
  @Command({
    alias: `rti`,
    command: `run-transaction-import`,
  })
  async importTransactions(): Promise<void> {
    console.log(`Importing transactions from Olive.`);
    await this.importPaginated(
      (pageSize, pageNumber) =>
        this.olive.pullTransactions(pageSize, pageNumber),
      Transaction,
      `olive`,
    );
    console.log(`Importing transactions from Loyalize.`);
    await this.importPaginated(
      (pageSize, pageNumber) =>
        this.loyalize.pullTransactions(pageSize, pageNumber),
      Transaction,
      `loyalize`,
    );
  }

  /**
   * Import Cards using shared logic
   */
  async importCards(): Promise<void> {
    console.log(`Importing cards.`);
    return this.importPaginated(
      (pageSize, pageNumber) => this.olive.pullCards(pageSize, pageNumber),
      Card,
      `olive`,
    );
  }

  @Command({
    alias: `hr`,
    command: `handle-redemptions`,
  })
  async handleRedemptions() {
    await this.metrics.resaveRedemptionsWithUserIdAndProgramId();
  }
}
