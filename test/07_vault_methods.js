const { Tezos, signerAlice, signerBob, signerEve } = require("./utils/cli");
const { rejects, strictEqual, notStrictEqual, deepEqual } = require("assert");
const BigNumber = require("bignumber.js");
const Vault = require("./helpers/vaultInterface");
const BridgeCore = require("./helpers/bridgeInterface");
const vaultStorage = require("./storage/vault");
const bridgeStorage = require("./storage/bridgeCore");
const Token = require("./helpers/tokenInterface");
const WrappedToken = require("./helpers/wrappedTokenInterface");
const { alice, bob, eve } = require("../scripts/sandbox/accounts");
const { MichelsonMap } = require("@taquito/taquito");
const { confirmOperation } = require("../scripts/confirmation");
const keccak256 = require("keccak256");

const fa12TokenStorage = require("../test/storage/FA12");
const fa2TokenStorage = require("../test/storage/FA2");
const wrappedTokenStorage = require("../test/storage/wrappedToken");
const precision = 10 ** 6;

const packPayload = require("../scripts/packPayload");
const packWithdrawal = require("../scripts/packWithdrawal");

const CHAIN_ID = "05010000000f4e6574586451707263566b70615755";
describe("Vault methods tests", async function () {
  let vault;
  let bridge;
  let fa12Token;
  let fa2Token;
  let wrappedToken;
  let fa12Token_2;
  let fa12Token_3;
  before(async () => {
    Tezos.setSignerProvider(signerAlice);
    try {
      fa12Token = await new Token().init(fa12TokenStorage);
      fa12Token_2 = await new Token().init(fa12TokenStorage);
      fa12Token_3 = await new Token().init(fa12TokenStorage);
      fa2Token = await new Token("fa2").init(fa2TokenStorage);

      wrappedToken = await new WrappedToken("fa2").init(
        wrappedTokenStorage,
        "wrapped_token",
      );

      await wrappedToken.createToken(
        MichelsonMap.fromLiteral({
          name: Buffer.from("wrapped", "ascii").toString("hex"),
        }),
      );
      await wrappedToken.call("mint", [
        [{ token_id: 0, recipient: alice.pkh, amount: 100 * precision }],
      ]);

      bridgeStorage.initial_round = 1;
      bridgeStorage.last_round = 4;
      bridgeStorage.banned_relays = MichelsonMap.fromLiteral({
        [eve.pk]: true,
      });
      bridgeStorage.rounds = MichelsonMap.fromLiteral({
        1: {
          end_time: String(Date.now() + 1000),
          ttl: String(Date.now() + 2000),
          relays: [alice.pk],
          required_signatures: 1,
        },
        2: {
          end_time: String(0),
          ttl: String(2000),
          relays: [alice.pk],
          required_signatures: 1,
        },
        3: {
          end_time: String(Date.now() + 1000),
          ttl: String(Date.now() + 2000),
          relays: [alice.pk],
          required_signatures: 2,
        },
        4: {
          end_time: String(Date.now() + 1000),
          ttl: String(Date.now() + 2000),
          relays: [alice.pk, bob.pk],
          required_signatures: 1,
        },
      });
      bridge = await new BridgeCore().init(bridgeStorage, "bridge_core");

      vaultStorage.storage.bridge = bridge.address;
      vaultStorage.storage.assets = MichelsonMap.fromLiteral({
        0: {
          asset_type: { fa12: fa12Token.address },
          deposit_fee_f: 100000,
          withdrawal_fee_f: 100000,
          deposit_limit: 1000 * precision,
          tvl: 180 * precision,
          virtual_balance: 0,
        },
        1: {
          asset_type: { fa2: { address: fa2Token.address, id: 0 } },
          deposit_fee_f: 100000,
          withdrawal_fee_f: 100000,
          deposit_limit: 0,
          tvl: 50 * precision,
          virtual_balance: 0,
        },
        2: {
          asset_type: { tez: null },
          deposit_fee_f: 100000,
          withdrawal_fee_f: 100000,
          deposit_limit: 300 * precision,
          tvl: 10 * precision,
          virtual_balance: 0,
        },
        3: {
          asset_type: { wrapped: { address: wrappedToken.address, id: 0 } },
          deposit_fee_f: 100000,
          withdrawal_fee_f: 100000,
          deposit_limit: 0,
          tvl: 90 * precision,
          virtual_balance: 90 * precision,
        },
        4: {
          asset_type: { fa12: alice.pkh },
          deposit_fee_f: 100000,
          withdrawal_fee_f: 100000,
          deposit_limit: 0,
          tvl: 0,
          virtual_balance: 0,
        },
        5: {
          asset_type: { fa12: alice.pkh },
          deposit_fee_f: 100000,
          withdrawal_fee_f: 100000,
          deposit_limit: 0,
          tvl: 0,
          virtual_balance: 0,
        },
        6: {
          asset_type: { fa12: fa12Token_2.address },
          deposit_fee_f: 0,
          withdrawal_fee_f: 0,
          deposit_limit: 0,
          tvl: 0,
          virtual_balance: 0,
          pending_fee: 0,
        },
      });
      vaultStorage.storage.asset_ids.set({ fa12: fa12Token.address }, 0);
      vaultStorage.storage.asset_ids.set(
        { fa2: { address: fa2Token.address, id: 0 } },
        1,
      );
      vaultStorage.storage.asset_ids.set({ tez: null }, 2);
      vaultStorage.storage.asset_ids.set(
        { wrapped: { address: wrappedToken.address, id: 0 } },
        3,
      );
      vaultStorage.storage.asset_ids.set({ fa12: alice.pkh }, 4);
      vaultStorage.storage.asset_ids.set({ fa12: bob.pkh }, 5);
      vaultStorage.storage.asset_ids.set({ fa12: fa12Token_2.address }, 6);
      vaultStorage.storage.asset_count = 7;
      vaultStorage.storage.emergency_shutdown = true;
      vaultStorage.storage.fee_balances = MichelsonMap.fromLiteral({});
      vault = await new Vault().init(vaultStorage, "vault");
      await vault.setLambdas();
      await wrappedToken.call("set_vault", vault.address);
    } catch (e) {
      console.log(e);
    }
  });

  describe("Testing entrypoint: Deposit", async function () {
    it("Shouldn't deposit if emergency shutdown is enabled", async function () {
      await rejects(
        vault.call("deposit", ["001100", 0, "fa12", alice.pkh]),
        err => {
          strictEqual(err.message, "Vault/emergency-shutdown-enabled");
          return true;
        },
      );
      await vault.call("toggle_emergency_shutdown");
    });
    it("Shouldn't deposit if amount + tvl > deposit limit", async function () {
      await rejects(
        vault.call("deposit", [
          "001100",
          99999 * precision,
          "fa12",
          fa12Token.address,
        ]),
        err => {
          strictEqual(err.message, "Vault/respect-deposit-limit");
          return true;
        },
      );
    });
    it("Shouldn't deposit if asset is banned", async function () {
      await vault.call("toggle_ban_asset", ["fa12", bob.pkh]);
      await rejects(
        vault.call("deposit", ["001100", 0, "fa12", bob.pkh]),
        err => {
          strictEqual(err.message, "Vault/asset-is-banned");
          return true;
        },
      );
    });
    it("Shouldn't deposit if transfer amount 0", async function () {
      await rejects(
        vault.call("deposit", ["001100", 0, "fa12", fa12Token.address]),
        err => {
          strictEqual(err.message, "Vault/zero-transfer");
          return true;
        },
      );
    });
    it("Should deposit fa12 asset", async function () {
      const depositAmount = 100 * precision;
      await fa12Token.approveToken(vault.address, depositAmount);
      const prevDepositCount = vault.storage.deposit_count.toNumber();
      const prevAsset = await vault.storage.assets.get("0");
      await vault.call("deposit", [
        "001100",
        depositAmount,
        "fa12",
        fa12Token.address,
      ]);
      const asset = await vault.storage.assets.get("0");
      const vaultBalance = await fa12Token.getBalance(vault.address);
      const fee = Math.floor(
        (depositAmount * asset.deposit_fee_f.toNumber()) / precision,
      );
      const feeBalances = await vault.storage.fee_balances.get("0");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newDeposit = await vault.storage.deposits.get("0");
      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);
      strictEqual(
        asset.tvl.toNumber(),
        prevAsset.tvl.toNumber() + depositAmount - fee,
      );
      strictEqual(
        asset.virtual_balance.toNumber(),
        prevAsset.virtual_balance.toNumber() + depositAmount - fee,
      );
      strictEqual(vaultBalance, depositAmount);
      strictEqual(fishFee.toNumber(), (fee * precision) / 2);
      strictEqual(managementFee.toNumber(), (fee * precision) / 2);
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(newDeposit.amount.toNumber(), depositAmount - fee);
      deepEqual(newDeposit.asset, {
        fa12: fa12Token.address,
      });
    });
    it("Should deposit fa2 asset", async function () {
      const depositAmount = 100 * precision;
      await fa2Token.approveToken(
        vault.address,
        depositAmount,
        alice.pkh,
        fa2Token.tokenId,
      );
      const prevDepositCount = vault.storage.deposit_count.toNumber();
      const prevAsset = await vault.storage.assets.get("1");
      await vault.call("deposit", [
        "001100",
        depositAmount,
        "fa2",
        fa2Token.address,
        fa2Token.tokenId,
      ]);
      const asset = await vault.storage.assets.get("1");
      const vaultBalance = await fa2Token.getBalance(vault.address);
      const fee = Math.floor(
        (depositAmount * asset.deposit_fee_f.toNumber()) / precision,
      );
      const feeBalances = await vault.storage.fee_balances.get("1");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newDeposit = await vault.storage.deposits.get("1");

      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);
      strictEqual(
        asset.tvl.toNumber(),
        prevAsset.tvl.toNumber() + depositAmount - fee,
      );
      strictEqual(
        asset.virtual_balance.toNumber(),
        prevAsset.virtual_balance.toNumber() + depositAmount - fee,
      );
      strictEqual(vaultBalance, depositAmount);
      strictEqual(fishFee.toNumber(), (fee * precision) / 2);
      strictEqual(managementFee.toNumber(), (fee * precision) / 2);
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(newDeposit.amount.toNumber(), depositAmount - fee);
      deepEqual(newDeposit.asset, {
        fa2: {
          address: fa2Token.address,
          id: BigNumber(fa2Token.tokenId),
        },
      });
    });
    it("Should deposit tez asset", async function () {
      Tezos.setSignerProvider(signerAlice);
      const depositAmount = 200 * precision;
      const prevDepositCount = vault.storage.deposit_count.toNumber();
      const prevAsset = await vault.storage.assets.get("2");
      await vault.call(
        "deposit",
        ["001100", depositAmount, "tez"],
        depositAmount / 1e6,
      );
      const asset = await vault.storage.assets.get("2");
      const vaultBalance = await Tezos.tz
        .getBalance(vault.address)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const fee = Math.floor(
        (depositAmount * asset.deposit_fee_f.toNumber()) / precision,
      );
      const feeBalances = await vault.storage.fee_balances.get("2");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newDeposit = await vault.storage.deposits.get("2");

      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);
      strictEqual(
        asset.tvl.toNumber(),
        prevAsset.tvl.toNumber() + depositAmount - fee,
      );
      strictEqual(vaultBalance, depositAmount);
      strictEqual(fishFee.toNumber(), (fee * precision) / 2);
      strictEqual(managementFee.toNumber(), (fee * precision) / 2);
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(newDeposit.amount.toNumber(), depositAmount - fee);
      notStrictEqual(newDeposit.asset["tez"], undefined);
    });
    it("Should deposit wrapped asset", async function () {
      const depositAmount = 100 * precision;
      const prevDepositCount = vault.storage.deposit_count.toNumber();
      await wrappedToken.approveToken(
        vault.address,
        depositAmount,
        alice.pkh,
        wrappedToken.tokenId,
      );

      await vault.call("deposit", [
        "001100",
        depositAmount,
        "wrapped",
        wrappedToken.address,
        wrappedToken.tokenId,
      ]);
      const asset = await vault.storage.assets.get("3");
      const aliceBalance = await wrappedToken.getWBalance(alice.pkh);
      const fee = Math.floor(
        (depositAmount * asset.deposit_fee_f.toNumber()) / precision,
      );
      const feeBalances = await vault.storage.fee_balances.get("3");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newDeposit = await vault.storage.deposits.get("3");

      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);
      strictEqual(asset.tvl.toNumber(), 0);
      strictEqual(asset.virtual_balance.toNumber(), 0);
      strictEqual(aliceBalance, 0);
      strictEqual(fishFee.toNumber(), (fee * precision) / 2);
      strictEqual(managementFee.toNumber(), (fee * precision) / 2);
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(newDeposit.amount.toNumber(), depositAmount - fee);
      deepEqual(newDeposit.asset, {
        wrapped: {
          address: wrappedToken.address,
          id: BigNumber(wrappedToken.tokenId),
        },
      });
    });
    it("Should deposit without fee", async function () {
      const depositAmount = 100 * precision;
      await fa12Token_2.approveToken(vault.address, depositAmount);
      const prevDepositCount = vault.storage.deposit_count.toNumber();
      await vault.call("deposit", [
        "001100",
        depositAmount,
        "fa12",
        fa12Token_2.address,
      ]);
      const asset = await vault.storage.assets.get("6");
      const vaultBalance = await fa12Token.getBalance(vault.address);

      const feeBalances = await vault.storage.fee_balances.get("6");

      const newDeposit = await vault.storage.deposits.get("4");
      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);
      strictEqual(asset.tvl.toNumber(), depositAmount);
      strictEqual(asset.virtual_balance.toNumber(), depositAmount);
      strictEqual(vaultBalance, depositAmount);
      strictEqual(feeBalances, undefined);
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(newDeposit.amount.toNumber(), depositAmount);
      deepEqual(newDeposit.asset, {
        fa12: fa12Token_2.address,
      });
    });
    it("Should deposit unknown asset", async function () {
      const depositAmount = 100 * precision;
      const prevDepositCount = vault.storage.deposit_count.toNumber();
      await fa12Token_3.approveToken(vault.address, depositAmount);
      const prevAsset = await vault.storage.assets.get("7");
      await vault.call("deposit", [
        "001100",
        depositAmount,
        "fa12",
        fa12Token_3.address,
      ]);
      const asset = await vault.storage.assets.get("7");
      const vaultBalance = await fa12Token_3.getBalance(vault.address);
      const fee = Math.floor(
        (depositAmount * asset.deposit_fee_f.toNumber()) / precision,
      );
      const feeBalances = await vault.storage.fee_balances.get("7");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newDeposit = await vault.storage.deposits.get("5");

      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);
      strictEqual(prevAsset, undefined);
      strictEqual(asset.tvl.toNumber(), depositAmount - fee);
      strictEqual(asset.virtual_balance.toNumber(), depositAmount - fee);
      strictEqual(vaultBalance, depositAmount);
      strictEqual(fishFee.toNumber(), (fee * precision) / 2);
      strictEqual(managementFee.toNumber(), (fee * precision) / 2);
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(newDeposit.amount.toNumber(), depositAmount - fee);
      deepEqual(newDeposit.asset, {
        fa12: fa12Token_3.address,
      });
    });
  });
  describe("Testing entrypoint: Withdraw", async function () {
    const payload_1 = {
      eventTrxLt: 1,
      eventTimestamp: String(Date.now()),
      eventData: "0011",
      confWid: 0,
      confAddr: 1337,
      eventContractWid: 0,
      eventContractAddr: 1337,
      proxy: bob.pkh,
      round: 3,
    };
    it("Shouldn't withdraw if emergency shutdown is enabled", async function () {
      await vault.call("toggle_emergency_shutdown");
      const signature = await signerAlice.sign("0021");
      await rejects(
        vault.call("withdraw", {
          payload: "0021",
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/emergency-shutdown-enabled");
          return true;
        },
      );
      await vault.call("toggle_emergency_shutdown");
    });
    it("Shouldn't withdraw if invalid payload", async function () {
      const signature = await signerAlice.sign("0021");
      await rejects(
        vault.call("withdraw", {
          payload: "0021",
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/invalid-payload");
          return true;
        },
      );
    });
    it("Shouldn't withdraw if round greater than last round", async function () {
      payload_1.round = 10;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/round-greater-than-last-round");
          return true;
        },
      );
    });
    it("Shouldn't withdraw if round is less than initial round", async function () {
      payload_1.round = 0;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/round-less-than-initial-round");
          return true;
        },
      );
    });
    it("Shouldn't withdraw if the signature's expiration date is out of date", async function () {
      payload_1.round = 2;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);

      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/round-outdated");
          return true;
        },
      );
    });
    it("Shouldn't withdraw if not enough signatures", async function () {
      payload_1.round = 3;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/not-enough-signatures");
          return true;
        },
      );
    });
    it("Shouldn't withdraw if relay is unknown", async function () {
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerBob.sign(payload);
      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/not-enough-signatures");
          return true;
        },
      );
    });
    it("Shouldn't withdraw if public key does not match signature", async function () {
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [bob.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/not-enough-signatures");
          return true;
        },
      );
    });
    it("Shouldn't withdraw if the relay is banned", async function () {
      payload_1.round = 4;
      const payload = packPayload(payload_1);
      const signature = await signerEve.sign(payload);
      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [eve.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/not-enough-signatures");
          return true;
        },
      );
    });
    it("Shouldn't withdraw if asset is banned", async function () {
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "00",
        amount: 100,
        recipient: alice.pkh,
        assetType: "FA12",
        assetAddress: bob.pkh,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/asset-is-banned");
          return true;
        },
      );
    });
    it("Shouldn't withdraw if transfer amount 0", async function () {
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "00",
        amount: 0,
        recipient: alice.pkh,
        assetType: "FA12",
        assetAddress: fa12Token.address,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/zero-transfer");
          return true;
        },
      );
    });
    it("Shouldn't withdraw if wrong event config", async function () {
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "00",
        amount: 1000000,
        recipient: alice.pkh,
        assetType: "FA12",
        assetAddress: fa12Token.address,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/wrong-event-configuration");
          return true;
        },
      );
    });
    it("Shouldn't withdraw if wrong chain id", async function () {
      payload_1.confAddr = 20102010;
      payload_1.confWid = 2;
      payload_1.eventData = packWithdrawal({
        chainId: "0000",
        depositId: "00",
        amount: 1000000,
        recipient: alice.pkh,
        assetType: "FA12",
        assetAddress: fa12Token.address,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/wrong-chain-id");
          return true;
        },
      );
    });
    it("Should withdraw fa12 asset", async function () {
      const withdrawalAmount = 30 * precision;

      payload_1.confAddr = 20102010;
      payload_1.confWid = 2;
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "00",
        amount: withdrawalAmount,
        recipient: alice.pkh,
        assetType: "FA12",
        assetAddress: fa12Token.address,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);

      const prevWithdrawalCount = vault.storage.withdrawal_count.toNumber();
      const prevAliceBalance = await fa12Token.getBalance(alice.pkh);
      const prevVaultBalance = await fa12Token.getBalance(vault.address);
      const prevAsset = await vault.storage.assets.get("0");
      const prevFeeBalances = await vault.storage.fee_balances.get("0");
      const prevFishFee = await prevFeeBalances.get(vault.storage.fish);
      const prevManagementFee = await prevFeeBalances.get(
        vault.storage.management,
      );

      await vault.call("withdraw", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
      });
      const aliceBalance = await fa12Token.getBalance(alice.pkh);
      const asset = await vault.storage.assets.get("0");
      const vaultBalance = await fa12Token.getBalance(vault.address);
      const fee = Math.floor(
        (withdrawalAmount * asset.withdrawal_fee_f.toNumber()) / precision,
      );

      const feeBalances = await vault.storage.fee_balances.get("0");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newWithdrawal = await vault.storage.withdrawals.get("0");

      const payloadHash = keccak256(Buffer.from(payload, "hex")).toString(
        "hex",
      );
      const newWithdrawalId = await vault.storage.withdrawal_ids.get(
        payloadHash,
      );
      strictEqual(
        vault.storage.withdrawal_count.toNumber(),
        prevWithdrawalCount + 1,
      );
      strictEqual(
        asset.tvl.toNumber(),
        prevAsset.tvl.toNumber() - withdrawalAmount,
      );
      strictEqual(vaultBalance, prevVaultBalance - (withdrawalAmount - fee));
      strictEqual(aliceBalance, prevAliceBalance + withdrawalAmount - fee);
      strictEqual(
        fishFee.toNumber(),
        prevFishFee.toNumber() + (fee * precision) / 2,
      );
      strictEqual(
        managementFee.toNumber(),
        prevManagementFee.toNumber() + (fee * precision) / 2,
      );
      strictEqual(newWithdrawal.recipient, alice.pkh);
      strictEqual(newWithdrawal.amount.toNumber(), withdrawalAmount - fee);
      deepEqual(newWithdrawal.asset, {
        fa12: fa12Token.address,
      });

      strictEqual(newWithdrawalId.toNumber(), 0);
    });
    it("Should withdraw fa2 asset", async function () {
      const withdrawalAmount = 90 * precision;

      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "01",
        amount: withdrawalAmount,
        recipient: alice.pkh,
        assetType: "FA2",
        assetAddress: fa2Token.address,
        assetId: fa2Token.tokenId,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);

      const prevWithdrawalCount = vault.storage.withdrawal_count.toNumber();
      const prevAliceBalance = await fa2Token.getBalance(alice.pkh);
      const prevVaultBalance = await fa2Token.getBalance(vault.address);
      const prevAsset = await vault.storage.assets.get("1");
      const prevFeeBalances = await vault.storage.fee_balances.get("1");
      const prevFishFee = await prevFeeBalances.get(vault.storage.fish);
      const prevManagementFee = await prevFeeBalances.get(
        vault.storage.management,
      );

      await vault.call("withdraw", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
      });
      const aliceBalance = await fa2Token.getBalance(alice.pkh);
      const asset = await vault.storage.assets.get("1");
      const vaultBalance = await fa2Token.getBalance(vault.address);
      const fee = Math.floor(
        (withdrawalAmount * asset.withdrawal_fee_f.toNumber()) / precision,
      );

      const feeBalances = await vault.storage.fee_balances.get("1");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newWithdrawal = await vault.storage.withdrawals.get("1");
      const payloadHash = keccak256(Buffer.from(payload, "hex")).toString(
        "hex",
      );
      const newWithdrawalId = await vault.storage.withdrawal_ids.get(
        payloadHash,
      );
      strictEqual(
        vault.storage.withdrawal_count.toNumber(),
        prevWithdrawalCount + 1,
      );
      strictEqual(
        asset.tvl.toNumber(),
        prevAsset.tvl.toNumber() - withdrawalAmount,
      );
      strictEqual(vaultBalance, prevVaultBalance - (withdrawalAmount - fee));
      strictEqual(aliceBalance, prevAliceBalance + (withdrawalAmount - fee));
      strictEqual(
        fishFee.toNumber(),
        prevFishFee.toNumber() + (fee * precision) / 2,
      );
      strictEqual(
        managementFee.toNumber(),
        prevManagementFee.toNumber() + (fee * precision) / 2,
      );
      strictEqual(newWithdrawal.recipient, alice.pkh);
      strictEqual(newWithdrawal.amount.toNumber(), withdrawalAmount - fee);
      deepEqual(newWithdrawal.asset, {
        fa2: { address: fa2Token.address, id: BigNumber(fa2Token.tokenId) },
      });

      strictEqual(newWithdrawalId.toNumber(), 1);
    });
    it("Should withdraw tez asset", async function () {
      Tezos.setSignerProvider(signerBob);
      const withdrawalAmount = 90 * precision;

      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "02",
        amount: withdrawalAmount,
        recipient: alice.pkh,
        assetType: "TEZ",
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);

      const prevWithdrawalCount = vault.storage.withdrawal_count.toNumber();
      const prevAliceBalance = await Tezos.tz
        .getBalance(alice.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const prevVaultBalance = await Tezos.tz
        .getBalance(vault.address)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const prevAsset = await vault.storage.assets.get("2");
      const prevFeeBalances = await vault.storage.fee_balances.get("2");
      const prevFishFee = await prevFeeBalances.get(vault.storage.fish);
      const prevManagementFee = await prevFeeBalances.get(
        vault.storage.management,
      );

      await vault.call("withdraw", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
      });
      const aliceBalance = await Tezos.tz
        .getBalance(alice.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const vaultBalance = await Tezos.tz
        .getBalance(vault.address)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const asset = await vault.storage.assets.get("2");

      const fee = Math.floor(
        (withdrawalAmount * asset.withdrawal_fee_f.toNumber()) / precision,
      );

      const feeBalances = await vault.storage.fee_balances.get("2");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newWithdrawal = await vault.storage.withdrawals.get("2");
      const payloadHash = keccak256(Buffer.from(payload, "hex")).toString(
        "hex",
      );
      const newWithdrawalId = await vault.storage.withdrawal_ids.get(
        payloadHash,
      );
      strictEqual(
        vault.storage.withdrawal_count.toNumber(),
        prevWithdrawalCount + 1,
      );
      strictEqual(
        asset.tvl.toNumber(),
        prevAsset.tvl.toNumber() - withdrawalAmount,
      );
      strictEqual(
        vaultBalance,
        prevVaultBalance - Math.ceil(withdrawalAmount - fee),
      );
      strictEqual(
        aliceBalance,
        prevAliceBalance + Math.ceil(withdrawalAmount - fee),
      );
      strictEqual(
        fishFee.toNumber(),
        prevFishFee.toNumber() + (fee * precision) / 2,
      );
      strictEqual(
        managementFee.toNumber(),
        prevManagementFee.toNumber() + (fee * precision) / 2,
      );
      strictEqual(newWithdrawal.recipient, alice.pkh);
      strictEqual(newWithdrawal.amount.toNumber(), withdrawalAmount - fee);
      notStrictEqual(newWithdrawal.asset["tez"], undefined);

      strictEqual(newWithdrawalId.toNumber(), 2);
      Tezos.setSignerProvider(signerAlice);
    });
    it("Should withdraw wrapped asset", async function () {
      const withdrawalAmount = 90 * precision;
      payload_1.confAddr = 10101010;
      payload_1.confWid = 1;
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "03",
        amount: withdrawalAmount,
        recipient: alice.pkh,
        assetType: "WRAPPED",
        assetAddress: wrappedToken.address,
        assetId: wrappedToken.tokenId,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);

      const prevWithdrawalCount = vault.storage.withdrawal_count.toNumber();
      const prevAliceBalance = await wrappedToken.getWBalance(alice.pkh);

      const prevAsset = await vault.storage.assets.get("3");
      const prevFeeBalances = await vault.storage.fee_balances.get("3");
      const prevFishFee = await prevFeeBalances.get(vault.storage.fish);
      const prevManagementFee = await prevFeeBalances.get(
        vault.storage.management,
      );
      await vault.call("withdraw", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
      });
      const aliceBalance = await wrappedToken.getWBalance(alice.pkh);
      const asset = await vault.storage.assets.get("3");

      const fee = Math.floor(
        (withdrawalAmount * asset.withdrawal_fee_f.toNumber()) / precision,
      );

      const feeBalances = await vault.storage.fee_balances.get("3");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newWithdrawal = await vault.storage.withdrawals.get("3");
      const payloadHash = keccak256(Buffer.from(payload, "hex")).toString(
        "hex",
      );
      const newWithdrawalId = await vault.storage.withdrawal_ids.get(
        payloadHash,
      );
      strictEqual(
        vault.storage.withdrawal_count.toNumber(),
        prevWithdrawalCount + 1,
      );
      strictEqual(
        asset.tvl.toNumber(),
        prevAsset.tvl.toNumber() + (withdrawalAmount - fee),
      );
      strictEqual(aliceBalance, prevAliceBalance + (withdrawalAmount - fee));
      strictEqual(
        fishFee.toNumber(),
        prevFishFee.toNumber() + (fee * precision) / 2,
      );
      strictEqual(
        managementFee.toNumber(),
        prevManagementFee.toNumber() + (fee * precision) / 2,
      );
      strictEqual(newWithdrawal.recipient, alice.pkh);
      strictEqual(newWithdrawal.amount.toNumber(), withdrawalAmount - fee);
      deepEqual(newWithdrawal.asset, {
        wrapped: {
          address: wrappedToken.address,
          id: BigNumber(wrappedToken.tokenId),
        },
      });

      strictEqual(newWithdrawalId.toNumber(), 3);
    });
    it("Should create pending withdrawal fa2 asset", async function () {
      const withdrawalAmount = 90 * precision;
      payload_1.confAddr = 20102010;
      payload_1.confWid = 2;
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "01",
        amount: withdrawalAmount,
        recipient: alice.pkh,
        assetType: "FA2",
        assetAddress: fa2Token.address,
        assetId: fa2Token.tokenId,
        bounty: 1000000,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);

      const prevWithdrawalCount = vault.storage.withdrawal_count.toNumber();
      const prevAliceBalance = await fa2Token.getBalance(alice.pkh);
      const prevVaultBalance = await fa2Token.getBalance(vault.address);
      const prevAsset = await vault.storage.assets.get("1");
      const prevFeeBalances = await vault.storage.fee_balances.get("1");
      const prevFishFee = await prevFeeBalances.get(vault.storage.fish);
      const prevManagementFee = await prevFeeBalances.get(
        vault.storage.management,
      );
      await vault.call("withdraw", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
      });
      const aliceBalance = await fa2Token.getBalance(alice.pkh);
      const asset = await vault.storage.assets.get("1");
      const vaultBalance = await fa2Token.getBalance(vault.address);

      const feeBalances = await vault.storage.fee_balances.get("1");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newWithdrawal = await vault.storage.withdrawals.get("4");
      const payloadHash = keccak256(Buffer.from(payload, "hex")).toString(
        "hex",
      );
      const newWithdrawalId = await vault.storage.withdrawal_ids.get(
        payloadHash,
      );

      const newPendingWithdrawal = await vault.storage.pending_withdrawals.get(
        "0",
      );
      const fee = Math.floor(
        (withdrawalAmount * asset.withdrawal_fee_f.toNumber()) / precision,
      );
      strictEqual(
        vault.storage.withdrawal_count.toNumber(),
        prevWithdrawalCount,
      );
      strictEqual(asset.tvl.toNumber(), prevAsset.tvl.toNumber() - fee);
      strictEqual(vaultBalance, prevVaultBalance);
      strictEqual(aliceBalance, prevAliceBalance);
      strictEqual(
        fishFee.toNumber(),
        prevFishFee.toNumber() + Math.floor((fee * precision) / 2),
      );
      strictEqual(
        managementFee.toNumber(),
        prevManagementFee.toNumber() + Math.floor((fee * precision) / 2),
      );
      strictEqual(newWithdrawal, undefined);
      strictEqual(newWithdrawalId, undefined);

      notStrictEqual(newPendingWithdrawal.status["pending"], undefined);
      strictEqual(newPendingWithdrawal.bounty.toNumber(), 1000000);
    });
    it("Should create pending withdrawal tez asset", async function () {
      const operation = await Tezos.contract.transfer({
        to: eve.pkh,
        amount: 20,
      });
      await confirmOperation(Tezos, operation.hash);
      Tezos.setSignerProvider(signerEve);
      const withdrawalAmount = 250 * precision;
      payload_1.confAddr = 20102010;
      payload_1.confWid = 2;
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "02",
        amount: withdrawalAmount,
        recipient: alice.pkh,
        assetType: "TEZ",
        bounty: 5000,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);

      const prevWithdrawalCount = vault.storage.withdrawal_count.toNumber();
      const prevAliceBalance = await Tezos.tz
        .getBalance(alice.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const prevVaultBalance = await Tezos.tz
        .getBalance(vault.address)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const prevAsset = await vault.storage.assets.get("2");
      const prevFeeBalances = await vault.storage.fee_balances.get("2");
      const prevFishFee = await prevFeeBalances.get(vault.storage.fish);
      const prevManagementFee = await prevFeeBalances.get(
        vault.storage.management,
      );

      await vault.call("withdraw", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
      });

      const aliceBalance = await Tezos.tz
        .getBalance(alice.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const asset = await vault.storage.assets.get("2");
      const vaultBalance = await Tezos.tz
        .getBalance(vault.address)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));

      const feeBalances = await vault.storage.fee_balances.get("2");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newWithdrawal = await vault.storage.withdrawals.get("4");
      const payloadHash = keccak256(Buffer.from(payload, "hex")).toString(
        "hex",
      );
      const newWithdrawalId = await vault.storage.withdrawal_ids.get(
        payloadHash,
      );

      const newPendingWithdrawal = await vault.storage.pending_withdrawals.get(
        "1",
      );
      const fee = Math.floor(
        (withdrawalAmount * asset.withdrawal_fee_f.toNumber()) / precision,
      );
      strictEqual(
        vault.storage.withdrawal_count.toNumber(),
        prevWithdrawalCount,
      );

      strictEqual(asset.tvl.toNumber(), prevAsset.tvl.toNumber() - fee);
      strictEqual(vaultBalance, prevVaultBalance);
      strictEqual(aliceBalance, prevAliceBalance);
      strictEqual(
        fishFee.toNumber(),
        prevFishFee.toNumber() + Math.floor((fee * precision) / 2),
      );
      strictEqual(
        managementFee.toNumber(),
        prevManagementFee.toNumber() + Math.floor((fee * precision) / 2),
      );
      strictEqual(newWithdrawal, undefined);
      strictEqual(newWithdrawalId, undefined);

      notStrictEqual(newPendingWithdrawal.status["pending"], undefined);
      strictEqual(newPendingWithdrawal.bounty.toNumber(), 5000);
    });
    it("Should create pending withdrawal fa12 asset from Alice", async function () {
      const withdrawalAmount = 90 * precision;
      payload_1.confAddr = 20102010;
      payload_1.confWid = 2;
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "06",
        amount: withdrawalAmount,
        recipient: alice.pkh,
        assetType: "FA12",
        assetAddress: fa12Token.address,

        bounty: 1000000,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);

      const prevWithdrawalCount = vault.storage.withdrawal_count.toNumber();
      const prevAliceBalance = await fa12Token.getBalance(alice.pkh);
      const prevVaultBalance = await fa12Token.getBalance(vault.address);
      const prevAsset = await vault.storage.assets.get("0");
      const prevFeeBalances = await vault.storage.fee_balances.get("0");
      const prevFishFee = await prevFeeBalances.get(vault.storage.fish);
      const prevManagementFee = await prevFeeBalances.get(
        vault.storage.management,
      );

      await vault.call("withdraw", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
      });
      const aliceBalance = await fa12Token.getBalance(alice.pkh);
      const asset = await vault.storage.assets.get("0");
      const vaultBalance = await fa12Token.getBalance(vault.address);

      const feeBalances = await vault.storage.fee_balances.get("0");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newWithdrawal = await vault.storage.withdrawals.get(
        `${vault.storage.withdrawal_count}`,
      );
      const payloadHash = keccak256(Buffer.from(payload, "hex")).toString(
        "hex",
      );
      const newWithdrawalId = await vault.storage.withdrawal_ids.get(
        payloadHash,
      );

      const newPendingWithdrawal = await vault.storage.pending_withdrawals.get(
        "2",
      );
      const fee = Math.floor(
        (withdrawalAmount * asset.withdrawal_fee_f.toNumber()) / precision,
      );
      strictEqual(
        vault.storage.withdrawal_count.toNumber(),
        prevWithdrawalCount,
      );
      strictEqual(asset.tvl.toNumber(), prevAsset.tvl.toNumber() - fee);
      strictEqual(vaultBalance, prevVaultBalance);
      strictEqual(aliceBalance, prevAliceBalance);
      strictEqual(
        fishFee.toNumber(),
        prevFishFee.toNumber() + Math.floor((fee * precision) / 2),
      );
      strictEqual(
        managementFee.toNumber(),
        prevManagementFee.toNumber() + Math.floor((fee * precision) / 2),
      );
      strictEqual(newWithdrawal, undefined);
      strictEqual(newWithdrawalId, undefined);

      notStrictEqual(newPendingWithdrawal.status["pending"], undefined);
      strictEqual(newPendingWithdrawal.bounty.toNumber(), 1000000);
    });
    it("Should create pending withdrawal fa12 asset from Eve", async function () {
      const withdrawalAmount = 90 * precision;
      payload_1.confAddr = 20102010;
      payload_1.confWid = 2;
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "06",
        amount: withdrawalAmount,
        recipient: eve.pkh,
        assetType: "FA12",
        assetAddress: fa12Token.address,
        bounty: 1000000,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);

      const prevWithdrawalCount = vault.storage.withdrawal_count.toNumber();
      const prevEveBalance = await fa12Token.getBalance(eve.pkh);
      const prevVaultBalance = await fa12Token.getBalance(vault.address);
      const prevAsset = await vault.storage.assets.get("0");
      const prevFeeBalances = await vault.storage.fee_balances.get("0");
      const prevFishFee = await prevFeeBalances.get(vault.storage.fish);
      const prevManagementFee = await prevFeeBalances.get(
        vault.storage.management,
      );

      await vault.call("withdraw", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
      });
      const eveBalance = await fa12Token.getBalance(eve.pkh);
      const asset = await vault.storage.assets.get("0");
      const vaultBalance = await fa12Token.getBalance(vault.address);

      const feeBalances = await vault.storage.fee_balances.get("0");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newWithdrawal = await vault.storage.withdrawals.get(
        `${vault.storage.withdrawal_count}`,
      );
      const payloadHash = keccak256(Buffer.from(payload, "hex")).toString(
        "hex",
      );
      const newWithdrawalId = await vault.storage.withdrawal_ids.get(
        payloadHash,
      );

      const newPendingWithdrawal = await vault.storage.pending_withdrawals.get(
        "3",
      );
      const fee = Math.floor(
        (withdrawalAmount * asset.withdrawal_fee_f.toNumber()) / precision,
      );
      strictEqual(
        vault.storage.withdrawal_count.toNumber(),
        prevWithdrawalCount,
      );
      strictEqual(asset.tvl.toNumber(), prevAsset.tvl.toNumber() - fee);
      strictEqual(vaultBalance, prevVaultBalance);
      strictEqual(eveBalance, prevEveBalance);
      strictEqual(
        fishFee.toNumber(),
        prevFishFee.toNumber() + Math.floor((fee * precision) / 2),
      );
      strictEqual(
        managementFee.toNumber(),
        prevManagementFee.toNumber() + Math.floor((fee * precision) / 2),
      );
      strictEqual(newWithdrawal, undefined);
      strictEqual(newWithdrawalId, undefined);

      notStrictEqual(newPendingWithdrawal.status["pending"], undefined);
      strictEqual(newPendingWithdrawal.bounty.toNumber(), 1000000);
    });
    it("Should create pending withdrawal tez asset from Eve", async function () {
      Tezos.setSignerProvider(signerEve);
      const withdrawalAmount = 100 * precision;
      payload_1.confAddr = 20102010;
      payload_1.confWid = 2;
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "02",
        amount: withdrawalAmount,
        recipient: alice.pkh,
        assetType: "TEZ",
        bounty: 5000,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);

      const prevWithdrawalCount = vault.storage.withdrawal_count.toNumber();
      const prevAliceBalance = await Tezos.tz
        .getBalance(alice.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const prevVaultBalance = await Tezos.tz
        .getBalance(vault.address)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const prevAsset = await vault.storage.assets.get("2");
      const prevFeeBalances = await vault.storage.fee_balances.get("2");
      const prevFishFee = await prevFeeBalances.get(vault.storage.fish);
      const prevManagementFee = await prevFeeBalances.get(
        vault.storage.management,
      );

      await vault.call("withdraw", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
      });
      const aliceBalance = await Tezos.tz
        .getBalance(alice.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const asset = await vault.storage.assets.get("2");
      const vaultBalance = await Tezos.tz
        .getBalance(vault.address)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));

      const feeBalances = await vault.storage.fee_balances.get("2");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newWithdrawal = await vault.storage.withdrawals.get("4");
      const payloadHash = keccak256(Buffer.from(payload, "hex")).toString(
        "hex",
      );
      const newWithdrawalId = await vault.storage.withdrawal_ids.get(
        payloadHash,
      );

      const newPendingWithdrawal = await vault.storage.pending_withdrawals.get(
        "4",
      );
      const fee = Math.floor(
        (withdrawalAmount * asset.withdrawal_fee_f.toNumber()) / precision,
      );
      strictEqual(
        vault.storage.withdrawal_count.toNumber(),
        prevWithdrawalCount,
      );

      strictEqual(asset.tvl.toNumber(), prevAsset.tvl.toNumber() - fee);
      strictEqual(vaultBalance, prevVaultBalance);
      strictEqual(aliceBalance, prevAliceBalance);
      strictEqual(
        fishFee.toNumber(),
        prevFishFee.toNumber() + Math.floor((fee * precision) / 2),
      );
      strictEqual(
        managementFee.toNumber(),
        prevManagementFee.toNumber() + Math.floor((fee * precision) / 2),
      );
      strictEqual(newWithdrawal, undefined);
      strictEqual(newWithdrawalId, undefined);

      notStrictEqual(newPendingWithdrawal.status["pending"], undefined);
      strictEqual(newPendingWithdrawal.bounty.toNumber(), 5000);
    });
    it("Shouldn't create pending withdrawal if payload already seen", async function () {
      const withdrawalAmount = 90 * precision;
      payload_1.confAddr = 20102010;
      payload_1.confWid = 2;
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "01",
        amount: withdrawalAmount,
        recipient: alice.pkh,
        assetType: "FA2",
        assetAddress: fa2Token.address,
        assetId: fa2Token.tokenId,
        bounty: 1000000,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/payload-already-seen");
          return true;
        },
      );
    });
    it("Shouldn't withdraw if payload already seen", async function () {
      const withdrawalAmount = 90 * precision;
      payload_1.confAddr = 10101010;
      payload_1.confWid = 1;
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "03",
        amount: withdrawalAmount,
        recipient: alice.pkh,
        assetType: "WRAPPED",
        assetAddress: wrappedToken.address,
        assetId: wrappedToken.tokenId,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/payload-already-seen");
          return true;
        },
      );
    });

    it("Shouldn't withdraw unknown wrapped asset if metadata not passed", async function () {
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "00",
        amount: 1000,
        recipient: alice.pkh,
        assetType: "WRAPPED",
        assetAddress: wrappedToken.address,
        assetId: 10,
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        vault.call("withdraw", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Vault/metadata-undefined");
          return true;
        },
      );
    });
    it("Should withdraw unknown wrapped asset", async function () {
      const withdrawalAmount = 90 * precision;
      const map = MichelsonMap.fromLiteral({
        symbol: Buffer.from("0000", "ascii").toString(),
        name: Buffer.from("0000", "ascii").toString(),
        decimals: Buffer.from("0000", "ascii").toString(),
        description: Buffer.from("0000", "ascii").toString(),
        thumbnailUrl: Buffer.from("0000", "ascii").toString(),
        isTransferable: Buffer.from("1111", "ascii").toString(),
        shouldPreferSymbol: Buffer.from("0000", "ascii").toString(),
      });
      payload_1.confAddr = 10101010;
      payload_1.confWid = 1;
      payload_1.eventData = packWithdrawal({
        chainId: CHAIN_ID,
        depositId: "04",
        amount: withdrawalAmount,
        recipient: alice.pkh,
        assetType: "WRAPPED",
        assetAddress: wrappedToken.address,
        assetId: 1,
        metadata: {
          symbol: Buffer.from("0000", "ascii").toString(),
          name: Buffer.from("0000", "ascii").toString(),
          decimals: Buffer.from("0000", "ascii").toString(),
          description: Buffer.from("0000", "ascii").toString(),
          thumbnailUrl: Buffer.from("0000", "ascii").toString(),
          isTransferable: Buffer.from("1111", "ascii").toString(),
          shouldPreferSymbol: Buffer.from("0000", "ascii").toString(),
        },
      });
      payload_1.round = 1;
      const payload = packPayload(payload_1);
      const signature = await signerAlice.sign(payload);

      const prevWithdrawalCount = vault.storage.withdrawal_count.toNumber();
      const prevAliceBalance = await wrappedToken.getWBalance(alice.pkh, 1);
      await vault.call("withdraw", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
      });

      const aliceBalance = await wrappedToken.getWBalance(alice.pkh, 1);
      const newAssetId = vault.storage.asset_count.toNumber() - 1;
      const asset = await vault.storage.assets.get(`${newAssetId}`);

      const fee = Math.floor(
        (withdrawalAmount * asset.withdrawal_fee_f.toNumber()) / precision,
      );

      const feeBalances = await vault.storage.fee_balances.get(newAssetId);
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);
      const payloadHash = keccak256(Buffer.from(payload, "hex")).toString(
        "hex",
      );
      const newWithdrawalId = await vault.storage.withdrawal_ids.get(
        payloadHash,
      );
      const newWithdrawal = await vault.storage.withdrawals.get(
        `${newWithdrawalId}`,
      );

      const newWrappedToken = await wrappedToken.storage.token_metadata.get(
        "1",
      );
      notStrictEqual(newWrappedToken, undefined);
      strictEqual(
        vault.storage.withdrawal_count.toNumber(),
        prevWithdrawalCount + 1,
      );
      strictEqual(asset.tvl.toNumber(), withdrawalAmount - fee);
      strictEqual(aliceBalance, prevAliceBalance + (withdrawalAmount - fee));
      strictEqual(fishFee.toNumber(), (fee * precision) / 2);
      strictEqual(managementFee.toNumber(), (fee * precision) / 2);
      strictEqual(newWithdrawal.recipient, alice.pkh);
      strictEqual(newWithdrawal.amount.toNumber(), withdrawalAmount - fee);
      strictEqual(newWithdrawal.asset.wrapped.address, wrappedToken.address);
      strictEqual(newWithdrawal.asset.wrapped.id.toNumber(), 1);
    });
  });
  describe("Testing entrypoint: Cancel_withdrawal", async function () {
    it("Shouldn't cancel pending withdrawal if unknown pending withdrawal", async function () {
      await rejects(vault.call("cancel_withdrawal", [5, "0000"]), err => {
        strictEqual(err.message, "Vault/unknown-pending-withdrawal");
        return true;
      });
    });
    it("Shouldn't cancel pending withdrawal if sender not recipient", async function () {
      Tezos.setSignerProvider(signerBob);
      await rejects(vault.call("cancel_withdrawal", [0, "0000"]), err => {
        strictEqual(err.message, "Vault/not-recipient");
        return true;
      });
    });
    it("Should cancel pending withdrawal", async function () {
      Tezos.setSignerProvider(signerAlice);
      const prevFeeBalances = await vault.storage.fee_balances.get("2");
      const prevFishFee = await prevFeeBalances.get(vault.storage.fish);
      const prevManagementFee = await prevFeeBalances.get(
        vault.storage.management,
      );
      const prevAsset = await vault.storage.assets.get("2");
      await vault.call("cancel_withdrawal", [1, "0000"]);
      const withdrawal = await vault.storage.pending_withdrawals.get("1");
      const newDeposit = await vault.storage.deposits.get(
        `${vault.storage.deposit_count.toNumber() - 1}`,
      );
      const feeBalances = await vault.storage.fee_balances.get("2");
      const asset = await vault.storage.assets.get("2");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      strictEqual(asset.tvl.toNumber(), prevAsset.tvl.toNumber());

      strictEqual(
        asset.virtual_balance.toNumber(),
        prevAsset.virtual_balance.toNumber(),
      );
      notStrictEqual(withdrawal.status["canceled"], undefined);
      strictEqual(newDeposit.recipient, "0000");
      strictEqual(newDeposit.amount.toNumber(), withdrawal.amount.toNumber());
      strictEqual(fishFee.toNumber(), prevFishFee.toNumber());
      strictEqual(managementFee.toNumber(), prevManagementFee.toNumber());
    });

    it("Shouldn't cancel pending withdrawal if pending withdrawal is closed", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("cancel_withdrawal", [1, "0000"]), err => {
        strictEqual(err.message, "Vault/pending-withdrawal-closed");
        return true;
      });
    });
  });
  describe("Testing entrypoint: Set_bounty", async function () {
    it("Shouldn't set_bounty if unknown pending withdrawal", async function () {
      await rejects(vault.call("set_bounty", [5, 10000]), err => {
        strictEqual(err.message, "Vault/unknown-pending-withdrawal");
        return true;
      });
    });
    it("Shouldn't set_bounty if sender not recipient", async function () {
      Tezos.setSignerProvider(signerBob);
      await rejects(vault.call("set_bounty", [0, 10000]), err => {
        strictEqual(err.message, "Vault/not-recipient");
        return true;
      });
    });
    it("Shouldn't set_bounty if bounty too high", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(
        vault.call("set_bounty", [2, 10000000 * precision]),
        err => {
          strictEqual(err.message, "Vault/bounty-too-high");
          return true;
        },
      );
    });
    it("Shouldn't set_bounty if pending withdrawal is closed", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("set_bounty", [1, 10 * precision]), err => {
        strictEqual(err.message, "Vault/pending-withdrawal-closed");
        return true;
      });
    });

    it("Should set_bounty", async function () {
      await vault.call("set_bounty", [2, 10000]);
      const wihdrawal = await vault.storage.pending_withdrawals.get("2");
      strictEqual(wihdrawal.bounty.toNumber(), 10000);
    });
  });
  describe("Testing entrypoint: Deposit_with_bounty", async function () {
    it("Shouldn't deposit if emergency shutdown is enabled", async function () {
      await vault.call("toggle_emergency_shutdown");
      await rejects(
        vault.call("deposit_with_bounty", ["001100", 0, 0, [1], 10]),
        err => {
          strictEqual(err.message, "Vault/emergency-shutdown-enabled");
          return true;
        },
      );
      await vault.call("toggle_emergency_shutdown");
    });
    it("Shouldn't deposit if assets do not match", async function () {
      await rejects(
        vault.call("deposit_with_bounty", [
          "001100",
          100 * precision,
          0,
          [1],
          10,
        ]),
        err => {
          strictEqual(err.message, "Vault/assets-do-not-match");
          return true;
        },
      );
    });
    it("Shouldn't deposit if amount + tvl > deposit limit", async function () {
      await rejects(
        vault.call(
          "deposit_with_bounty",
          ["001100", 250 * precision, 2, [1], 10],
          (250 * precision) / 1e6,
        ),
        err => {
          strictEqual(err.message, "Vault/respect-deposit-limit");
          return true;
        },
      );
    });
    it("Shouldn't deposit if deposit zero amount", async function () {
      await rejects(
        vault.call("deposit_with_bounty", ["001100", 0, 0, [1], 10]),
        err => {
          strictEqual(err.message, "Vault/zero-transfer");
          return true;
        },
      );
    });
    it("Shouldn't deposit if amount less than pending withdrawal amount", async function () {
      await rejects(
        vault.call("deposit_with_bounty", ["001100", 200, 0, [2], 100]),
        err => {
          strictEqual(
            err.message,
            "Vault/amount-less-than-pending-withdrawal-amount",
          );
          return true;
        },
      );
    });
    it("Shouldn't deposit if pending withdrawal is closed", async function () {
      await rejects(
        vault.call(
          "deposit_with_bounty",
          ["001100", 1000, 2, [1], 1000],
          1000 / 1e6,
        ),
        err => {
          strictEqual(err.message, "Vault/pending-withdrawal-closed");
          return true;
        },
      );
    });
    it("Shouldn't deposit if bounty lower than expected bounty", async function () {
      const depositAmount = 120 * precision;
      await rejects(
        vault.call(
          "deposit_with_bounty",
          ["001100", depositAmount, 2, [4], 1000000000000000],
          depositAmount / 1e6,
        ),
        err => {
          strictEqual(err.message, "Vault/bounty-lower-than-expected");
          return true;
        },
      );
    });
    it("Should deposit with bounty", async function () {
      Tezos.setSignerProvider(signerBob);
      const depositAmount = 120 * precision;
      const prevDepositCount = vault.storage.deposit_count.toNumber();
      const prevWithdrawalCount = vault.storage.withdrawal_count.toNumber();
      const prevAliceBalance = await Tezos.tz
        .getBalance(alice.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const prevAsset = await vault.storage.assets.get("2");
      const prevFeeBalances = await vault.storage.fee_balances.get("2");
      const prevFishFee = await prevFeeBalances.get(vault.storage.fish);
      const prevManagementFee = await prevFeeBalances.get(
        vault.storage.management,
      );
      await vault.call(
        "deposit_with_bounty",
        ["001100", depositAmount, 2, [4], 100],
        depositAmount / 1e6,
      );

      const asset = await vault.storage.assets.get("2");
      const aliceBalance = await Tezos.tz
        .getBalance(alice.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));

      const depositFee = Math.floor(
        (depositAmount * asset.deposit_fee_f.toNumber()) / precision,
      );

      const feeBalances = await vault.storage.fee_balances.get("2");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newDeposit = await vault.storage.deposits.get(
        `${prevDepositCount}`,
      );
      const newWithdrawal = await vault.storage.withdrawals.get(
        `${prevWithdrawalCount}`,
      );
      const pendingWithdrawal = await vault.storage.pending_withdrawals.get(
        "4",
      );

      notStrictEqual(pendingWithdrawal.status["completed"], undefined);
      notStrictEqual(newWithdrawal, undefined);
      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);

      strictEqual(
        asset.tvl.toNumber(),
        prevAsset.tvl.toNumber() +
          depositAmount -
          depositFee -
          pendingWithdrawal.amount.toNumber(),
      );
      strictEqual(
        asset.virtual_balance.toNumber(),
        prevAsset.virtual_balance.toNumber() +
          depositAmount -
          depositFee -
          pendingWithdrawal.amount.toNumber(),
      );

      strictEqual(
        fishFee.toNumber(),
        prevFishFee.toNumber() + (depositFee * precision) / 2,
      );
      strictEqual(
        managementFee.toNumber(),
        prevManagementFee.toNumber() + (depositFee * precision) / 2,
      );
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(
        newDeposit.amount.toNumber(),
        depositAmount - depositFee + pendingWithdrawal.bounty.toNumber(),
      );
      notStrictEqual(newDeposit.asset["tez"], undefined);
      strictEqual(
        aliceBalance,
        prevAliceBalance +
          pendingWithdrawal.amount.toNumber() -
          pendingWithdrawal.bounty.toNumber(),
      );
    });
    it("Should deposit with 2 pending withdrawals", async function () {
      Tezos.setSignerProvider(signerBob);

      const depositAmount = 200 * precision;
      await fa12Token.approveToken(vault.address, depositAmount);
      const prevDepositCount = vault.storage.deposit_count.toNumber();
      const prevWithdrawalCount = vault.storage.withdrawal_count.toNumber();
      const prevAliceBalance = await fa12Token.getBalance(alice.pkh);
      const prevEveBalance = await fa12Token.getBalance(eve.pkh);
      const prevAsset = await vault.storage.assets.get("0");
      const prevFeeBalances = await vault.storage.fee_balances.get("0");
      const prevFishFee = await prevFeeBalances.get(vault.storage.fish);
      const prevManagementFee = await prevFeeBalances.get(
        vault.storage.management,
      );
      await vault.call("deposit_with_bounty", [
        "001100",
        depositAmount,
        0,
        [2, 3],
        10,
      ]);

      const asset = await vault.storage.assets.get("0");
      const aliceBalance = await fa12Token.getBalance(alice.pkh);
      const eveBalance = await fa12Token.getBalance(eve.pkh);
      const depositFee = Math.floor(
        (depositAmount * asset.deposit_fee_f.toNumber()) / precision,
      );

      const feeBalances = await vault.storage.fee_balances.get("0");
      const fishFee = await feeBalances.get(vault.storage.fish);
      const managementFee = await feeBalances.get(vault.storage.management);

      const newDeposit = await vault.storage.deposits.get(
        `${prevDepositCount}`,
      );
      const newWithdrawal_1 = await vault.storage.withdrawals.get(
        `${prevWithdrawalCount - 2}`,
      );
      const newWithdrawal_2 = await vault.storage.withdrawals.get(
        `${prevWithdrawalCount - 1}`,
      );
      const pendingWithdrawal_1 = await vault.storage.pending_withdrawals.get(
        "2",
      );
      const pendingWithdrawal_2 = await vault.storage.pending_withdrawals.get(
        "3",
      );

      const totalWithdrawalAmount =
        pendingWithdrawal_1.amount.toNumber() +
        pendingWithdrawal_2.amount.toNumber();
      notStrictEqual(pendingWithdrawal_1.status["completed"], undefined);
      notStrictEqual(pendingWithdrawal_2.status["completed"], undefined);
      notStrictEqual(newWithdrawal_1, undefined);
      notStrictEqual(newWithdrawal_2, undefined);
      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);

      strictEqual(
        asset.tvl.toNumber(),
        prevAsset.tvl.toNumber() +
          depositAmount -
          depositFee -
          totalWithdrawalAmount,
      );
      strictEqual(
        asset.virtual_balance.toNumber(),
        prevAsset.virtual_balance.toNumber() +
          depositAmount -
          depositFee -
          totalWithdrawalAmount,
      );
      strictEqual(
        fishFee.toNumber(),
        prevFishFee.toNumber() + (depositFee * precision) / 2,
      );
      strictEqual(
        managementFee.toNumber(),
        prevManagementFee.toNumber() + (depositFee * precision) / 2,
      );
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(
        newDeposit.amount.toNumber(),
        depositAmount -
          depositFee +
          pendingWithdrawal_1.bounty.toNumber() +
          pendingWithdrawal_2.bounty.toNumber(),
      );
      notStrictEqual(newDeposit.asset["fa12"], undefined);
      strictEqual(
        aliceBalance,
        prevAliceBalance +
          pendingWithdrawal_1.amount.toNumber() -
          pendingWithdrawal_1.bounty.toNumber(),
      );
      strictEqual(
        eveBalance,
        prevEveBalance +
          pendingWithdrawal_2.amount.toNumber() -
          pendingWithdrawal_2.bounty.toNumber(),
      );
    });
  });
});
