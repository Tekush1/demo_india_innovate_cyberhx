export interface Entity {
  id: string;
  name: string;
  type: string;
  domain: string;
  metadata?: any;
}

export interface Relationship {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  description: string;
  strength: number;
  timestamp: string;
}

export interface Feed {
  id: string;
  content: string;
  domain: string;
  source_url?: string;
  timestamp: string;
}

export interface GraphData {
  nodes: Entity[];
  links: Relationship[];
}
