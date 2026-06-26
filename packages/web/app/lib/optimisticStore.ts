type Listener = () => void;

class OptimisticStoreClass {
  private followingSet: Set<string> = new Set();
  private pendingSet: Set<string> = new Set();
  private listeners: Set<Listener> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("linkora_optimistic_following");
      if (stored) {
        try {
          const arr = JSON.parse(stored);
          this.followingSet = new Set(arr);
        } catch {
          // Ignore parsing errors
        }
      }
    }
  }

  isFollowing(address: string): boolean {
    return this.followingSet.has(address);
  }

  isPending(address: string): boolean {
    return this.pendingSet.has(address);
  }

  setFollowing(address: string, isFollow: boolean) {
    if (isFollow) {
      this.followingSet.add(address);
    } else {
      this.followingSet.delete(address);
    }
    this.save();
    this.notify();
  }

  setPending(address: string, isPending: boolean) {
    if (isPending) {
      this.pendingSet.add(address);
    } else {
      this.pendingSet.delete(address);
    }
    this.notify();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private save() {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "linkora_optimistic_following",
        JSON.stringify(Array.from(this.followingSet))
      );
    }
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const OptimisticStore = new OptimisticStoreClass();
