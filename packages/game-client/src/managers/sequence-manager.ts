/**
 * Sequence number manager for tracking input acknowledgments
 * 
 * Manages sequence numbers for inputs to enable rollback/replay
 * when server corrections arrive.
 */
export class SequenceManager {
  private nextSequence: number = 0;
  private lastAcknowledgedSequence: number = -1;

  /**
   * Get the next sequence number for a new input
   */
  getNextSequence(): number {
    return this.nextSequence++;
  }

  /**
   * Acknowledge that the server has processed a sequence number
   */
  acknowledgeSequence(seq: number): void {
    if (seq > this.lastAcknowledgedSequence) {
      this.lastAcknowledgedSequence = seq;
    }
  }

  /**
   * Get all unacknowledged sequence numbers
   */
  getUnacknowledgedInputs(): number[] {
    const unacked: number[] = [];
    for (
      let i = this.lastAcknowledgedSequence + 1;
      i < this.nextSequence;
      i++
    ) {
      unacked.push(i);
    }
    return unacked;
  }

  /**
   * Get the last acknowledged sequence number
   */
  getLastAcknowledgedSequence(): number {
    return this.lastAcknowledgedSequence;
  }

  /**
   * Reset sequence numbers (useful for reconnection)
   */
  reset(): void {
    this.nextSequence = 0;
    this.lastAcknowledgedSequence = -1;
  }
}

