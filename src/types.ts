export interface Entity {
  id: string;
  name: string;
  type: string;
  domain: string;
  metadata?: string;
}

export interface Relationship {
  id: number;
  source_id: string;
  target_id: string;
  type: string;
  description: string;
  strength: number;
  timestamp: string;
}

export interface Feed {
  id: number;
  content: string;
  domain: string;
  source_url?: string;
  timestamp: string;
}

export interface GraphData {
  nodes: Entity[];
  links: Relationship[];
}
