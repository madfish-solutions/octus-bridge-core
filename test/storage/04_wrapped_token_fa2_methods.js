const { Tezos, signerAlice, alice, bob } = require("./utils/cli");

const { rejects, strictEqual } = require("assert");
const { MichelsonMap } = require("@taquito/taquito");
const WrappedToken = require("./helpers/wrappedTokenInterface");
const wrappedStorage = require("./storage/wrappedToken");
const { migrate } = require("../scripts/helpers");
const { confirmOperation } = require("../scripts/confirmation");

const transferAmount = 1000 * 10 ** 6;
describe("Wrapped token FA2 methods test", async function () {
  let token;
  before(async () => {
    Tezos.setSignerProvider(signerAlice);
    try {
      Tezos.setSignerProvider(signerAlice);
      try {
        token = await new WrappedToken("FA2").init(
          wrappedStorage,
          "wrapped_token",
        );
      } catch (e) {
        console.log(e);
      }

      await token.call("create_token", [
        MichelsonMap.fromLiteral({
          symbol: Buffer.from("wEVER").toString("hex"),
          name: Buffer.from("Wrapped EVER").toString("hex"),
          decimals: Buffer.from("6").toString("hex"),
          icon: Buffer.from("").toString("hex"),
        }),
      ]);
      await token.call("mint", [
        [{ token_id: 0, recipient: alice.pkh, amount: 10000 * 10 ** 6 }],
      ]);
    } catch (e) {
      console.log(e);
    }
  });
  describe("Scope: Test Transfer entrypoint", async function () {
    describe("Scenario 1: Shouldn't Transfer cases", async function () {
      it("Shouldn't Transfer if not operator or owner", async function () {
        Tezos.setSignerProvider(signerAlice);

        await rejects(
          token.transfer(bob.pkh, alice.pkh, 999999 * 10 ** 9),

          err => {
            strictEqual(err.message, "FA2_NOT_OPERATOR");
            return true;
          },
        );
      });
      it("Shouldn't Transfer with insufficient balance", async function () {
        await rejects(
          token.transfer(alice.pkh, bob.pkh, 100000 * 10 ** 9),
          err => {
            strictEqual(err.message, "FA2_INSUFFICIENT_BALANCE");
            return true;
          },
        );
      });
    });
    // Scenario 2
    describe("Scenario 2: Should cases Transfer", async function () {
      it("Should allow Transfer", async function () {
        const prevAliceBalance = await token.getWBalance(alice.pkh, 0);
        const prevBobBalance = await token.getWBalance(bob.pkh, 0);
        await token.transfer(alice.pkh, bob.pkh, transferAmount);
        await token.updateStorage();

        const aliceBalance = await token.getWBalance(alice.pkh, 0);
        const bobBalance = await token.getWBalance(bob.pkh, 0);

        strictEqual(bobBalance, prevBobBalance + transferAmount);
        strictEqual(aliceBalance, prevAliceBalance - transferAmount);
      });
    });
  });
  describe("Scope: Test Update_operators entrypoint.", async function () {
    describe("Scenario 1: Shouldn't Update_operators cases", async function () {
      it("Shouldn't Add_operator if the user is not an owner", async function () {
        await rejects(
          token.updateOperator("add_operator", bob.pkh, alice.pkh, 0),
          err => {
            strictEqual(err.message, "FA2_NOT_OWNER");
            return true;
          },
        );
      });
      it("Shouldn't Remove_operator if the user is not an owner", async function () {
        await rejects(
          token.updateOperator("remove_operator", bob.pkh, alice.pkh, 0),
          err => {
            strictEqual(err.message, "FA2_NOT_OWNER");
            return true;
          },
        );
      });
    });
    describe("Scenario 2: Should Update_operators cases", async function () {
      it("Should allow add operator", async function () {
        await token.updateOperator("add_operator", alice.pkh, bob.pkh, 0);
        await token.updateStorage();
        const aliceAllowances = await token.storage.allowances.get([
          alice.pkh,
          0,
        ]);
        strictEqual(aliceAllowances[0], bob.pkh);
      });

      it("Should allow remove_operator", async function () {
        await token.updateOperator("remove_operator", alice.pkh, bob.pkh, 0);
        await token.updateStorage();
        const aliceAllowances = await token.storage.allowances.get([
          alice.pkh,
          0,
        ]);
        strictEqual(aliceAllowances[0], undefined);
      });
    });
  });
  describe("Scope: Test Balance_of entrypoint.", async function () {
    let deployedGb;
    let gbContract;
    before(async () => {
      deployedGb = await migrate(Tezos, "get_balance", {
        response: 0,
        bridge_address: token.address,
      });
      gbContract = await Tezos.contract.at(deployedGb);
    });
    it("Should allow get balance", async function () {
      const op = await gbContract.methods.balance_of(bob.pkh, 0).send();
      await confirmOperation(Tezos, op.hash);
      const storage = await gbContract.storage();

      strictEqual(storage.response.toNumber(), transferAmount);
    });
    Tezos.setSignerProvider(signerAlice);
  });
});
