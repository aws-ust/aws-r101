import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  membershipPaymentCampaigns,
  membershipPaymentChatLinks,
} from "../../db/schema";

export type ResultGroupLinks = {
  membersGroupLink: string | null;
  committeeChatLink: string | null;
  committeeName: string | null;
};

/**
 * The Members Facebook Group and the accepted committee's group chat, as set
 * on the Community Links page. Accepted applicants can use these as soon as
 * their results are released, before any payment happens.
 */
export async function loadResultGroupLinks(
  recruitmentYear: number,
  committee: { id: string; name: string },
): Promise<ResultGroupLinks> {
  const [campaign] = await db
    .select({
      id: membershipPaymentCampaigns.id,
      generalChatLink: membershipPaymentCampaigns.generalChatLink,
    })
    .from(membershipPaymentCampaigns)
    .where(eq(membershipPaymentCampaigns.recruitmentYear, recruitmentYear))
    .limit(1);
  if (!campaign) {
    return { membersGroupLink: null, committeeChatLink: null, committeeName: committee.name };
  }
  const [link] = await db
    .select({ chatLink: membershipPaymentChatLinks.chatLink })
    .from(membershipPaymentChatLinks)
    .where(
      and(
        eq(membershipPaymentChatLinks.campaignId, campaign.id),
        eq(membershipPaymentChatLinks.committeeId, committee.id),
      ),
    )
    .limit(1);
  return {
    membersGroupLink: campaign.generalChatLink,
    committeeChatLink: link?.chatLink ?? null,
    committeeName: committee.name,
  };
}
