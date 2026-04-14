-include .env

.PHONY: all test clean deploy deployDryRun deployLocal deployHashkey deploy-erc8004 grantAgentRegistrarRole grantPolicyAdminRole fund help install snapshot format anvil scopefile flatten encryptKey

DEFAULT_ANVIL_KEY := 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
DEFAULT_ZKSYNC_LOCAL_KEY := 0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110
CONTRACT_DEPLOYER_SEPOLIA ?= $(DEPLOYER_ADDRESS)
ZERO_ADDRESS := 0x0000000000000000000000000000000000000000
PATRI_CON_DEPLOY_SCRIPT := scripts/DeployPatricon.s.sol:DeployPatricon
PATRI_CON_ROLE_SCRIPT := scripts/GrantRoles.s.sol:GrantRoles
PATRI_CON_ERC8004_DEPLOY_SCRIPT := scripts/DeployERC8004.s.sol:DeployERC8004

RPC_URL ?= $(HASHKEY_TESTNET_RPC_URL)
ACCOUNT ?= account1
TARGET_POOL_ADDRESS ?= $(ZERO_ADDRESS)
AGENT_REGISTRY_ADDRESS ?=
POLICY_REGISTRY_ADDRESS ?=
ROLE_GRANTEE ?= $(CONTRACT_DEPLOYER_SEPOLIA)

all: remove install build

# Clean the repo
clean :; forge clean

# Remove modules
remove :; rm -rf .gitmodules && rm -rf .git/modules/* && rm -rf lib && touch .gitmodules && git add . && git commit -m "modules"

install :; forge install foundry-rs/forge-std@v1.8.2 && forge install openzeppelin/openzeppelin-contracts@v5.0.2 && forge install eth-infinitism/account-abstraction@v0.7.0 && forge install cyfrin/foundry-era-contracts@0.0.3 && forge install cyfrin/foundry-devops@0.2.2

# Update Dependencies
update:; forge update

format :; forge fmt

anvil :; anvil -m 'test test test test test test test test test test test junk' --steps-tracing --block-time 1

slither :; slither . --config-file slither.config.json 

aderyn :; aderyn .

scope :; tree ./src/ | sed 's/└/#/g; s/──/--/g; s/├/#/g; s/│ /|/g; s/│/|/g'

scopefile :; @tree ./src/ | sed 's/└/#/g' | awk -F '── ' '!/\.sol$$/ { path[int((length($$0) - length($$2))/2)] = $$2; next } { p = "src"; for(i=2; i<=int((length($$0) - length($$2))/2); i++) if (path[i] != "") p = p "/" path[i]; print p "/" $$2; }' > scope.txt

# /*//////////////////////////////////////////////////////////////
#                               EVM
# //////////////////////////////////////////////////////////////*/
build:; forge build 

test :; forge test

testFork :; forge test --fork-url mainnet

snapshot :; forge snapshot 

# /*//////////////////////////////////////////////////////////////
#                          EVM - SCRIPTS
# //////////////////////////////////////////////////////////////*/
deployDryRun :; forge script $(PATRI_CON_DEPLOY_SCRIPT) --sig "run(address)" $(TARGET_POOL_ADDRESS) --rpc-url $(RPC_URL) -vvvv

deploy :; @test -n "$(ACCOUNT)" || (echo "ACCOUNT is required" && exit 1)
	forge script $(PATRI_CON_DEPLOY_SCRIPT) --sig "run(address)" $(TARGET_POOL_ADDRESS) --rpc-url $(RPC_URL) --account $(ACCOUNT) --broadcast -vvvv

deployLocal :; @test -n "$(ACCOUNT)" || (echo "ACCOUNT is required" && exit 1)
	forge script $(PATRI_CON_DEPLOY_SCRIPT) --sig "run(address)" $(TARGET_POOL_ADDRESS) --rpc-url http://127.0.0.1:8545 --account $(ACCOUNT) --broadcast -vvvv

deployHashkey :; @test -n "$(ACCOUNT)" || (echo "ACCOUNT is required" && exit 1)
	forge script $(PATRI_CON_DEPLOY_SCRIPT) --sig "run(address)" $(TARGET_POOL_ADDRESS) --rpc-url $(HASHKEY_TESTNET_RPC_URL) --account $(ACCOUNT) --broadcast -vvvv

deploy-erc8004 :; @test -n "$(ACCOUNT)" || (echo "ACCOUNT is required" && exit 1)
	@test -n "$(RPC_URL)" || (echo "RPC_URL is required" && exit 1)
	forge script $(PATRI_CON_ERC8004_DEPLOY_SCRIPT) --rpc-url $(RPC_URL) --account $(ACCOUNT) --broadcast -vvvv

grantAgentRegistrarRole :; @test -n "$(ACCOUNT)" || (echo "ACCOUNT is required" && exit 1)
	@test -n "$(RPC_URL)" || (echo "RPC_URL is required" && exit 1)
	@test -n "$(AGENT_REGISTRY_ADDRESS)" || (echo "AGENT_REGISTRY_ADDRESS is required" && exit 1)
	@test -n "$(ROLE_GRANTEE)" || (echo "ROLE_GRANTEE is required" && exit 1)
	forge script $(PATRI_CON_ROLE_SCRIPT) --sig "grantAgentRegistrarRole(address,address)" $(AGENT_REGISTRY_ADDRESS) $(ROLE_GRANTEE) --rpc-url $(RPC_URL) --account $(ACCOUNT) --broadcast -vvvv

grantPolicyAdminRole :; @test -n "$(ACCOUNT)" || (echo "ACCOUNT is required" && exit 1)
	@test -n "$(RPC_URL)" || (echo "RPC_URL is required" && exit 1)
	@test -n "$(POLICY_REGISTRY_ADDRESS)" || (echo "POLICY_REGISTRY_ADDRESS is required" && exit 1)
	@test -n "$(ROLE_GRANTEE)" || (echo "ROLE_GRANTEE is required" && exit 1)
	forge script $(PATRI_CON_ROLE_SCRIPT) --sig "grantPolicyAdminRole(address,address)" $(POLICY_REGISTRY_ADDRESS) $(ROLE_GRANTEE) --rpc-url $(RPC_URL) --account $(ACCOUNT) --broadcast -vvvv

# How we got the mock entrypoint contract so quick
getEntryPoint :; forge clone -c 1 --etherscan-api-key ${ETHERSCAN_API_KEY} 0x0000000071727De22E5E9d8BAf0edAc6f37da032 --no-git

flattenClone :; forge flatten src/core/EntryPoint.sol > MockEntryPoint.sol

deployEth :; forge script script/DeployMinimal.s.sol --rpc-url arbitrum --sender ${SMALL_MONEY_SENDER} --account smallmoney --broadcast --verify -vvvv

verify :; forge verify-contract --etherscan-api-key ${ETHERSCAN_API_KEY} --rpc-url ${MAINNET_RPC_URL} XXX <PATH_TO_CONTRACT>

getCalldata :; cast calldata "approve(address,uint256)" 0x9EA9b0cc1919def1A3CfAEF4F7A66eE3c36F86fC 100000000000000000000

estimate :; cast estimate "approve(address,uint256)" "approve(address,uint256)" 0x9EA9b0cc1919def1A3CfAEF4F7A66eE3c36F86fC 100000000000000000000

sendUserOp :; forge script script/SendPackedUserOp.s.sol --rpc-url arbitrum --sender ${SMALL_MONEY_SENDER} --account smallmoney --broadcast -vvvv

# /*//////////////////////////////////////////////////////////////
#                              ZKSYNC
# //////////////////////////////////////////////////////////////*/
zkbuild:; foundryup-zksync && forge build --zksync && foundryup

zktest :; foundryup-zksync && forge test --zksync --system-mode=true && foundryup

# /*//////////////////////////////////////////////////////////////
#                         ZKSYNC -SCRIPTS
# //////////////////////////////////////////////////////////////*/
zkanvil :; npx zksync-cli dev start

flatten :; tail -n +4 <(forge flatten src/zkSync/ZkMinimalAccount.sol) > ZkMinimalFlat.sol

encryptKey :; yarn encryptKey

zkdeploy :; yarn deploy 

sendTx :; yarn sendTx