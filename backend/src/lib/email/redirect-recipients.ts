import { executiveBoardCommitteeKey } from "../apply/committee-office-groups";
import { isExecutiveOfficeCommittee, lookupOfficerRecipient } from "./officer-recipients";

export function redirectPlacementCcEmails(input: {
  committee: string;
  positionTitle: string;
}): string[] {
  const cc = new Set<string>();
  const isAssistant = input.positionTitle.startsWith("Executive Assistant");
  const executiveKey =
    isExecutiveOfficeCommittee(input.committee) ?
      input.committee
    : executiveBoardCommitteeKey(input.committee);
  if (executiveKey) {
    const eb = lookupOfficerRecipient(executiveKey);
    if (eb) cc.add(eb.email);
  }
  if (!isAssistant) {
    const director = lookupOfficerRecipient(input.committee);
    if (director) cc.add(director.email);
  }
  return [...cc];
}
