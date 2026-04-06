import { AdapterConfig } from '../types/schema.js';

export abstract class BaseAdapter {
  abstract generate(config: AdapterConfig): void;
}
