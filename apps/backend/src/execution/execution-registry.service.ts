import { Injectable, Logger } from "@nestjs/common";
import type { ExecutionPlugin } from "./interfaces";

@Injectable()
export class ExecutionRegistryService {
  private readonly logger = new Logger(ExecutionRegistryService.name);
  private readonly executors = new Map<string, ExecutionPlugin>();

  register(plugin: ExecutionPlugin): void {
    const type = plugin.pluginType.toUpperCase();
    if (this.executors.has(type)) {
      this.logger.warn(`Executor for plugin type "${type}" is already registered. Skipping duplicate.`);
      return;
    }
    this.executors.set(type, plugin);
    this.logger.log(`Executor registered for plugin type: "${type}"`);
  }

  unregister(pluginType: string): void {
    const type = pluginType.toUpperCase();
    if (this.executors.delete(type)) {
      this.logger.log(`Executor unregistered for plugin type: "${type}"`);
    }
  }

  resolve(pluginType: string): ExecutionPlugin | null {
    return this.executors.get(pluginType.toUpperCase()) ?? null;
  }

  hasExecutor(pluginType: string): boolean {
    return this.executors.has(pluginType.toUpperCase());
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.executors.keys());
  }
}
