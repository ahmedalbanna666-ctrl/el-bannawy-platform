export interface PlayerPlugin {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  initialize?: (context: PlayerPluginContext) => void;
  destroy?: () => void;
}

export interface PlayerPluginContext {
  attemptId: string;
  assessmentId: string;
  getState: () => string;
  emit: (eventType: string, payload: unknown) => void;
}

export interface PlayerPluginRegistration {
  id: string;
  name: string;
  order: number;
  factory: (context: PlayerPluginContext) => PlayerPlugin;
}

export class AssessmentPlayerRegistry {
  private readonly plugins = new Map<string, PlayerPluginRegistration>();
  private readonly instances = new Map<string, PlayerPlugin>();

  registerPlugin(registration: PlayerPluginRegistration): void {
    if (this.plugins.has(registration.id)) {
      throw new Error(`Plugin with id "${registration.id}" is already registered`);
    }
    this.plugins.set(registration.id, registration);
  }

  unregisterPlugin(id: string): boolean {
    const existed = this.plugins.delete(id);
    this.instances.delete(id);
    return existed;
  }

  hasPlugin(id: string): boolean {
    return this.plugins.has(id);
  }

  getPluginIds(): readonly string[] {
    return Array.from(this.plugins.keys());
  }

  getPluginCount(): number {
    return this.plugins.size;
  }

  instantiate(context: PlayerPluginContext): readonly PlayerPlugin[] {
    const sorted = Array.from(this.plugins.values()).sort((a, b) => a.order - b.order);
    const instances: PlayerPlugin[] = [];

    for (const registration of sorted) {
      const instance = registration.factory(context);
      this.instances.set(instance.id, instance);
      instance.initialize?.(context);
      instances.push(instance);
    }

    return instances;
  }

  getInstances(): readonly PlayerPlugin[] {
    return Array.from(this.instances.values());
  }

  destroyAll(): void {
    for (const instance of this.instances.values()) {
      instance.destroy?.();
    }
    this.instances.clear();
  }

  clear(): void {
    this.destroyAll();
    this.plugins.clear();
  }
}
