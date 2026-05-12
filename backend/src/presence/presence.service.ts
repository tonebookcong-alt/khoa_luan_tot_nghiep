import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceService {
  private readonly connections = new Map<string, number>();

  add(userId: string) {
    this.connections.set(userId, (this.connections.get(userId) ?? 0) + 1);
  }

  remove(userId: string) {
    const count = this.connections.get(userId);
    if (!count) return;
    if (count <= 1) this.connections.delete(userId);
    else this.connections.set(userId, count - 1);
  }

  isOnline(userId: string): boolean {
    return this.connections.has(userId);
  }

  filterOnline(userIds: string[]): Set<string> {
    return new Set(userIds.filter((id) => this.connections.has(id)));
  }
}
