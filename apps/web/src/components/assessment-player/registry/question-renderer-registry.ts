import type {
  QuestionRendererComponent,
  QuestionRendererRegistryEntry,
  RendererRegistration,
} from "../types/renderer-contracts";

export const UNKNOWN_RENDERER_TYPE = "__unknown__";

export class QuestionRendererRegistry {
  private readonly renderers = new Map<string, QuestionRendererRegistryEntry>();

  register(
    type: string,
    component: QuestionRendererComponent,
    priority = 0,
  ): void {
    const existing = this.renderers.get(type);
    if (existing !== undefined && existing.priority >= priority) {
      return;
    }

    this.renderers.set(type, {
      type,
      component,
      priority,
      registeredAt: Date.now(),
    });
  }

  registerMany(registrations: readonly RendererRegistration[]): void {
    for (const registration of registrations) {
      this.register(registration.type, registration.component, registration.priority);
    }
  }

  unregister(type: string): boolean {
    return this.renderers.delete(type);
  }

  getRenderer(type: string): QuestionRendererComponent | null {
    const entry = this.renderers.get(type);
    if (entry) return entry.component;

    const unknownEntry = this.renderers.get(UNKNOWN_RENDERER_TYPE);
    return unknownEntry?.component ?? null;
  }

  hasRenderer(type: string): boolean {
    return this.renderers.has(type) || this.renderers.has(UNKNOWN_RENDERER_TYPE);
  }

  getRegisteredTypes(): readonly string[] {
    return Array.from(this.renderers.keys());
  }

  getRendererCount(): number {
    return this.renderers.size;
  }

  clear(): void {
    this.renderers.clear();
  }
}
