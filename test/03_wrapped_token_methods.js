const { Tezos, signerAlice, bob, signerBob } = require("./utils/cli");
const { MichelsonMap } = require("@taquito/taquito");
const { rejects, strictEqual, notStrictEqual } = require("assert");

const WrappedToken = require("./helpers/wrappedTokenInterface");
const wrappedStorage = require("./storage/wrappedToken");

describe("Wrapped token methods test", async function () {
  let token;

  before(async () => {
    Tezos.setSignerProvider(signerAlice);
    try {
      token = await new WrappedToken("FA2").init(
        wrappedStorage,
        "wrapped_token",
      );
      const balance = await token.getWBalance(bob.pkh, 0);
    } catch (e) {
      console.log(e);
    }
  });
  describe("Testing entrypoint: Set_owner", async function () {
    it("Shouldn't set owner if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerBob);
      await rejects(token.call("set_owner", bob.pkh), err => {
        strictEqual(err.message, "NOT_ADMIN");
        return true;
      });
    });
    it("Should allow start transfer ownership", async function () {
      Tezos.setSignerProvider(signerAlice);

      await token.call("set_owner", bob.pkh);
      await token.updateStorage();
      strictEqual(token.storage.pending_owner, bob.pkh);
    });
  });
  describe("Testing entrypoint: Set_owner", async function () {
    it("Shouldn't confirm owner if the user is not an pending owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(token.call("confirm_owner"), err => {
        strictEqual(err.message, "Wrapped-token/not-pending-owner");
        return true;
      });
    });
    it("Should allow confrirm owner", async function () {
      Tezos.setSignerProvider(signerBob);

      await token.call("confirm_owner");
      await token.updateStorage();
      strictEqual(token.storage.owner, bob.pkh);
      strictEqual(token.storage.pending_owner, null);
    });
  });
  describe("Testing entrypoint: Set_vault", async function () {
    it("Shouldn't set vault if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(token.call("set_vault", bob.pkh), err => {
        strictEqual(err.message, "NOT_ADMIN");
        return true;
      });
    });
    it("Should allow set vault", async function () {
      Tezos.setSignerProvider(signerBob);

      await token.call("set_vault", bob.pkh);
      await token.updateStorage();
      strictEqual(token.storage.vault, bob.pkh);
    });
  });
  describe("Testing entrypoint: Create_token", async function () {
    it("Shouldn't create_token if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(
        token.call("create_token", [
          MichelsonMap.fromLiteral({
            symbol: Buffer.from("wEVER").toString("hex"),
            name: Buffer.from("Wrapped EVER").toString("hex"),
            decimals: Buffer.from("6").toString("hex"),
            icon: Buffer.from("").toString("hex"),
          }),
        ]),
        err => {
          strictEqual(err.message, "NOT_ADMIN");
          return true;
        },
      );
    });
    it("Should allow create token", async function () {
      Tezos.setSignerProvider(signerBob);

      await token.call("create_token", [
        MichelsonMap.fromLiteral({
          symbol: Buffer.from("wEVER").toString("hex"),
          name: Buffer.from("Wrapped EVER").toString("hex"),
          decimals: Buffer.from("6").toString("hex"),
          icon: Buffer.from("").toString("hex"),
        }),
      ]);

      strictEqual(token.storage.token_count.toNumber(), 1);
    });
  });
  describe("Testing entrypoint: Mint", async function () {
    it("Shouldn't mint token if the user is not an bridge", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(
        token.call("mint", [
          [{ token_id: 0, recipient: bob.pkh, amount: 10000 }],
        ]),
        err => {
          strictEqual(err.message, "Wrapped-token/not-vault");
          return true;
        },
      );
    });
    it("Should allow mint tokens", async function () {
      Tezos.setSignerProvider(signerBob);

      await token.call("mint", [
        [{ token_id: 0, recipient: bob.pkh, amount: 10000 }],
      ]);

      const tokenSupply = await token.storage.tokens_supply.get("0");
      const balance = await token.getWBalance(bob.pkh, 0);
      strictEqual(tokenSupply.toNumber(), 10000);
      strictEqual(balance, 10000);
    });
  });
  describe("Testing entrypoint: Burn", async function () {
    it("Shouldn't burn tokens if the user is not an vault", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(token.call("burn", [0, bob.pkh, 1000]), err => {
        strictEqual(err.message, "Wrapped-token/not-vault");
        return true;
      });
    });
    it("Should allow burn tokens", async function () {
      Tezos.setSignerProvider(signerBob);

      await token.call("burn", [0, bob.pkh, 10000]);

      const tokenSupply = await token.storage.tokens_supply.get("0");
      const balance = await token.getBalance(bob.pkh, 0);
      strictEqual(tokenSupply.toNumber(), 0);
      strictEqual(balance, 0);
    });
  });
});
