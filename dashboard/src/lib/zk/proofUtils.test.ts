import { describe, expect, it } from "vitest";

import { formatGroth16ProofForContract } from "./proofUtils";
import type { ContractProofBundle } from "./zkTypes";

describe("formatGroth16ProofForContract", () => {
  it("formats Groth16 proof and public signals as 32-byte hex words", () => {
    const bundle: ContractProofBundle<6> = {
      proof: {
        pA: [1n, 2n],
        pB: [[3n, 4n], [5n, 6n]],
        pC: [7n, 8n]
      },
      publicSignals: [9n, 10n, 11n, 12n, 13n, 14n],
      signalLength: 6
    };

    const formatted = formatGroth16ProofForContract(bundle);

    expect(formatted.pA).toHaveLength(2);
    expect(formatted.pB).toHaveLength(2);
    expect(formatted.pB[0]).toHaveLength(2);
    expect(formatted.pC).toHaveLength(2);
    expect(formatted.publicInputs).toHaveLength(6);

    expect(formatted.pA[0]).toBe("0x0000000000000000000000000000000000000000000000000000000000000001");
    expect(formatted.pB[1][1]).toBe("0x0000000000000000000000000000000000000000000000000000000000000006");
    expect(formatted.publicInputs[5]).toBe("0x000000000000000000000000000000000000000000000000000000000000000e");
  });
});
