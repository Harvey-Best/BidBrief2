export type Confidence = 'high' | 'medium' | 'low';
export type FindingStatus = 'found' | 'not_found' | 'unclear';

export type BidFinding = {
  category: string;
  label: string;
  value: string;
  status: FindingStatus;
  document: string | null;
  page: number | null;
  evidence: string | null;
  confidence: Confidence;
  actionRequired: boolean;
};

export type BidBrief = {
  projectName: string;
  trade: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  criticalFlags: string[];
  findings: BidFinding[];
  nextActions: string[];
  disclaimer: string;
};
