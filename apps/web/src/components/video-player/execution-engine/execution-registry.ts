import type { ExecutionPlugin, ExecutionRegistry } from "./types";

export function createExecutionRegistry(): ExecutionRegistry {
  const executors = new Map<string, ExecutionPlugin>();

  return {
    register(plugin: ExecutionPlugin): void {
      const type = plugin.pluginType.toUpperCase();
      if (!executors.has(type)) {
        executors.set(type, plugin);
      }
    },

    unregister(pluginType: string): void {
      executors.delete(pluginType.toUpperCase());
    },

    resolve(pluginType: string): ExecutionPlugin | null {
      return executors.get(pluginType.toUpperCase()) ?? null;
    },

    hasExecutor(pluginType: string): boolean {
      return executors.has(pluginType.toUpperCase());
    },
  };
}
