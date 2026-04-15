export class ZKPolicyViolationError extends Error {
  public readonly proofName: string;

  constructor(proofName: string, message?: string) {
    super(message ?? `ZK policy violation: ${proofName}`);
    this.name = "ZKPolicyViolationError";
    this.proofName = proofName;
  }
}

export class ProofGenerationError extends Error {
  public readonly circuitName: string;

  public readonly inputSummary: string;

  constructor(circuitName: string, inputSummary: string, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(`Proof generation failed for ${circuitName}. Input summary: ${inputSummary}. Cause: ${causeMessage}`);
    this.name = "ProofGenerationError";
    this.circuitName = circuitName;
    this.inputSummary = inputSummary;
  }
}

export class CircuitNotFoundError extends Error {
  public readonly circuitName: string;

  constructor(circuitName: string) {
    super(`Circuit not found: ${circuitName}`);
    this.name = "CircuitNotFoundError";
    this.circuitName = circuitName;
  }
}
