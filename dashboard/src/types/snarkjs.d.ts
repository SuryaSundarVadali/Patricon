declare module "snarkjs" {
  export const groth16: {
    fullProve: (
      input: Record<string, unknown>,
      wasmPath: string,
      zkeyPath: string
    ) => Promise<unknown>;
    verify: (
      verificationKey: Record<string, unknown>,
      publicSignals: string[],
      proof: unknown
    ) => Promise<boolean>;
  };
}
