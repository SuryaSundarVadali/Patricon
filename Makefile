SHELL := /usr/bin/env bash

ROOT_DIR := $(shell pwd)
CIRCUITS_DIR := $(ROOT_DIR)/circuits
SCRIPTS_DIR := $(ROOT_DIR)/scripts

.PHONY: install compile setup prove verify export

install:
	bash $(SCRIPTS_DIR)/install_circom.sh
	pnpm install

compile:
	bash $(CIRCUITS_DIR)/scripts/compile.sh

setup:
	bash $(CIRCUITS_DIR)/scripts/setup.sh

prove:
	bash $(CIRCUITS_DIR)/scripts/prove.sh

verify:
	snarkjs groth16 verify $(CIRCUITS_DIR)/keys/agent_policy_verification_key.json $(CIRCUITS_DIR)/keys/agent_policy_public.json $(CIRCUITS_DIR)/keys/agent_policy_proof.json
	snarkjs groth16 verify $(CIRCUITS_DIR)/keys/kyc_threshold_verification_key.json $(CIRCUITS_DIR)/keys/kyc_threshold_public.json $(CIRCUITS_DIR)/keys/kyc_threshold_proof.json
	snarkjs groth16 verify $(CIRCUITS_DIR)/keys/jurisdiction_check_verification_key.json $(CIRCUITS_DIR)/keys/jurisdiction_check_public.json $(CIRCUITS_DIR)/keys/jurisdiction_check_proof.json

export:
	bash $(CIRCUITS_DIR)/scripts/export_verifier.sh
