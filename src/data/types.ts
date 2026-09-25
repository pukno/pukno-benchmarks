export type Row = Record<string, string>;

export type Workbook = {
  title: string;
  summary: string;
  modalities: { name: string; tasks: string }[];
  sheets: { name: string; purpose: string }[];
  rules: { rule: string; recommendation: string }[];
  modelColumns: string[];
  models: Row[];
  speedColumns: string[];
  speed: Row[];
  qualityColumns: string[];
  quality: Row[];
  hardwareColumns: string[];
  hardware: Row[];
  metricColumns: string[];
  metrics: Row[];
  scoreColumns: string[];
  scores: Row[];
  flowColumns: string[];
  flow: Row[];
  sourceColumns: string[];
  sources: Row[];
  dictionaryColumns: string[];
  dictionary: Row[];
};
