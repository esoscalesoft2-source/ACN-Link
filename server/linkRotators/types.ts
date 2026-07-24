export type LinkRotatorStatus = "Active" | "Inactive";

export type LinkRotatorDestinationRecord = {
  id: string;
  url: string;
  probability: number;
};

export type LinkRotatorRecord = {
  id: string;
  ownerUserId: string;
  name: string;
  description: string;
  slug: string;
  status: LinkRotatorStatus;
  destinations: LinkRotatorDestinationRecord[];
  totalClicks: number;
  createdAt: string;
  updatedAt: string;
};
