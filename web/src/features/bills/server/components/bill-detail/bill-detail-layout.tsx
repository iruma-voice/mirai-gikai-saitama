import { Container } from "@/components/layouts/container";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { BillDetailClient } from "../../../client/components/bill-detail/bill-detail-client";
import { BillDisclaimer } from "../../../client/components/bill-detail/bill-disclaimer";
import { BillStatusProgress } from "../../../client/components/bill-detail/bill-status-progress";
import { FactionStanceCard } from "../../../client/components/bill-detail/faction-stance-card";
import type { BillWithContent } from "../../../shared/types";
import { BillShareButtons } from "../share/bill-share-buttons";
import { BillContent } from "./bill-content";
import { BillDetailHeader } from "./bill-detail-header";

interface BillDetailLayoutProps {
  bill: BillWithContent;
  currentDifficulty: DifficultyLevelEnum;
}

export function BillDetailLayout({
  bill,
  currentDifficulty,
}: BillDetailLayoutProps) {
  const showStances =
    bill.status === "preparing" ||
    (bill.faction_stances && bill.faction_stances.length > 0);

  return (
    <div className="container mx-auto pb-8 max-w-4xl">
      <BillDetailClient bill={bill} currentDifficulty={currentDifficulty}>
        <BillDetailHeader bill={bill} />
        <Container>
          <div className="my-8">
            <BillStatusProgress
              status={bill.status}
              statusNote={bill.status_note}
            />
          </div>

          <BillContent bill={bill} />
        </Container>
      </BillDetailClient>

      <Container>
        {showStances && (
          <div className="my-8">
            <FactionStanceCard
              stances={bill.faction_stances ?? []}
              billStatus={bill.status}
            />
          </div>
        )}
        <div className="my-8">
          <BillShareButtons bill={bill} />
        </div>

        <div className="my-8">
          <BillDisclaimer />
        </div>
      </Container>
    </div>
  );
}
