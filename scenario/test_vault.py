from unittest import TestCase
from helpers import *
from constants import *
from initial_storage import vault_lambdas

import json
from pprint import pprint

from pytezos import ContractInterface, MichelsonRuntimeError

class VaultTest(TestCase):
    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        text = open("./builds/vault.json").read()
        code = json.loads(text)
        cls.ct = ContractInterface.from_micheline(code["michelson"])

        storage = cls.ct.storage.dummy()
        storage["storage"]["owner"] = admin
        storage["storage"]["bridge"] = bridge
        storage["storage"]["fish"] = fish
        storage["storage"]["management"] = management
        storage["vault_lambdas"] = vault_lambdas
        cls.storage = storage

        packer = ContractInterface.from_michelson(open("./scenario/payload-packer.tz").read())
        cls.packer = packer

    def test_vault_deposit_token(self):
        chain = MockChain(storage=self.storage)

        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=555_000, asset=token_a_fa2))

        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 555_000)
        self.assertEqual(transfers[0]["destination"], contract_self_address)
        self.assertEqual(transfers[0]["source"], me)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        payload = pack_withdraw_payload(self.packer, 222_000, alice, token_a_fa2, "01")

        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), view_results=vr)

        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 222_000)
        self.assertEqual(transfers[0]["destination"], alice)
        self.assertEqual(transfers[0]["source"], contract_self_address)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        with self.assertRaises(MichelsonRuntimeError) as error:
            res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), view_results=vr)
        self.assertIn("payload-already-seen", error.exception.args[-1])

        payload = pack_withdraw_payload(self.packer, 334_000, alice, token_a_fa2, "02")

        with self.assertRaises(MichelsonRuntimeError) as error:
            res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), view_results=vr)
        self.assertIn("not-nat", error.exception.args[-1])

    def test_vault_fees(self):
        chain = MockChain(storage=self.storage)

        fees = {
            "deposit_f": int(0.05 * PRECISION),
            "withdraw_f": int(0.05 * PRECISION),
        }
        chain.execute(self.ct.set_fees(native=fees, aliens=fees), sender=admin)

        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=777_666_000, asset=token_a_fa2))

        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 777_666_000)
        self.assertEqual(transfers[0]["destination"], contract_self_address)
        self.assertEqual(transfers[0]["source"], me)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        res = chain.execute(self.ct.claim_fee(asset_id=0, recipient=fish), sender=fish)
        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 19_441_650)
        self.assertEqual(transfers[0]["destination"], fish)
        self.assertEqual(transfers[0]["source"], contract_self_address)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        res = chain.execute(self.ct.claim_fee(asset_id=0, recipient=management), sender=management)
        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 19_441_650)
        self.assertEqual(transfers[0]["destination"], management)
        self.assertEqual(transfers[0]["source"], contract_self_address)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        with self.assertRaises(MichelsonRuntimeError) as error:
            res = chain.execute(self.ct.claim_fee(asset_id=0, recipient=fish), sender=fish)

        payload = pack_withdraw_payload(self.packer, 334_000, alice, token_a_fa2, "01")
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), view_results=vr)

        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 317_300)
        self.assertEqual(transfers[0]["destination"], alice)
        self.assertEqual(transfers[0]["source"], contract_self_address)
        self.assertEqual(transfers[0]["token_address"], token_a_address)


    def test_pending_withdraw_completion(self):
        chain = MockChain(storage=self.storage)

        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=150_000, asset=token_a_fa2), sender=alice)

        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 150_000)
        self.assertEqual(transfers[0]["destination"], contract_self_address)
        self.assertEqual(transfers[0]["source"], alice)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        # it is definitely not possible ask for 170k, since tvl is 150
        payload = pack_withdraw_payload(self.packer, 170_000, alice, token_a_fa2, "01")
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=alice, view_results=vr)

        # no transfers done, so it must have been added to pending list
        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 0)

        with self.assertRaises(MichelsonRuntimeError) as error:
            res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=160_000, asset_id=0, pending_withdrawal_ids=[0]))
        
        res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=200_000, asset_id=0, pending_withdrawal_ids=[0]), sender=bob)
        transfers = parse_transfers(res)

        self.assertEqual(len(transfers), 2) 
        self.assertEqual(transfers[0]["amount"], 200_000)
        self.assertEqual(transfers[0]["destination"], contract_self_address)
        self.assertEqual(transfers[0]["source"], bob)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        self.assertEqual(transfers[1]["amount"], 170_000)
        self.assertEqual(transfers[1]["source"], contract_self_address)
        self.assertEqual(transfers[1]["destination"], alice)
        self.assertEqual(transfers[1]["token_address"], token_a_address)

        payload = pack_withdraw_payload(self.packer, 30_000, carol, token_a_fa2, "01")
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=alice, view_results=vr)
        transfers = parse_transfers(res)

        self.assertEqual(transfers[0]["amount"], 30_000)
        self.assertEqual(transfers[0]["source"], contract_self_address)
        self.assertEqual(transfers[0]["destination"], carol)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

    def test_pending_withdraw_cancel(self):
        chain = MockChain(storage=self.storage)

        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=150_000, asset=token_a_fa2), sender=alice)

        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 150_000)
        self.assertEqual(transfers[0]["destination"], contract_self_address)
        self.assertEqual(transfers[0]["source"], alice)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        # nothing to cancel
        with self.assertRaises(MichelsonRuntimeError) as error:
            res = chain.execute(self.ct.cancel_withdrawal(pending_id=0, recipient=RECEIVER), sender=alice)

        # it is definitely not possible ask for 170k, since tvl is 150
        payload = pack_withdraw_payload(self.packer, 170_000, alice, token_a_fa2, "01")
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=alice, view_results=vr)

        # no transfers done, so it must have been added to pending list
        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 0)

        res = chain.execute(self.ct.cancel_withdrawal(pending_id=0, recipient=RECEIVER), sender=alice)

        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 0)

        # can't deposit since withdraw is canceled
        with self.assertRaises(MichelsonRuntimeError) as error:
            res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=200_000, asset_id=0, pending_withdrawal_ids=[0]), sender=bob)
            transfers = parse_transfers(res)

    def test_multiple_deposit_with_bounty(self):
        chain = MockChain(storage=self.storage)

        payload = pack_withdraw_payload(self.packer, 170_000, alice, token_a_fa2, "01", 600)
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=alice, view_results=vr)

        payload = pack_withdraw_payload(self.packer, 50_000, bob, token_a_fa2, "02", 100)
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=bob, view_results=vr)

        # too low to cover both withdraws
        with self.assertRaises(MichelsonRuntimeError) as error:
            res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=210_000, asset_id=0, pending_withdrawal_ids=[0, 1]), sender=carol)
        
        res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=220_000, asset_id=0, pending_withdrawal_ids=[0, 1]), sender=carol)
        transfers = parse_transfers(res)

        self.assertEqual(len(transfers), 3) 
        self.assertEqual(transfers[0]["amount"], 220_000)
        self.assertEqual(transfers[0]["destination"], contract_self_address)
        self.assertEqual(transfers[0]["source"], carol)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        self.assertEqual(transfers[1]["amount"], 50_000 - 100)
        self.assertEqual(transfers[1]["source"], contract_self_address)
        self.assertEqual(transfers[1]["destination"], bob)
        self.assertEqual(transfers[1]["token_address"], token_a_address)
    
        self.assertEqual(transfers[2]["amount"], 170_000 - 600)
        self.assertEqual(transfers[2]["source"], contract_self_address)
        self.assertEqual(transfers[2]["destination"], alice)
        self.assertEqual(transfers[2]["token_address"], token_a_address)

        # too late - already withdrawn
        with self.assertRaises(MichelsonRuntimeError) as error:
            res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=230_000, asset_id=0, pending_withdrawal_ids=[0, 1]), sender=carol)

    def test_multiple_deposit_with_wrong_asset(self):
        chain = MockChain(storage=self.storage)

        payload = pack_withdraw_payload(self.packer, 170_000, alice, token_a_fa2, "01", 600)
        chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=alice, view_results=vr)

        payload = pack_withdraw_payload(self.packer, 50_000, bob, token_b_fa2, "02", 100)
        chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=bob, view_results=vr)

        with self.assertRaises(MichelsonRuntimeError) as error:
            chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=220_000, asset_id=0, pending_withdrawal_ids=[0, 1]), sender=carol)

    def test_baking_rewards(self):
        chain = MockChain(storage=self.storage)

        res = chain.execute(self.ct.default(), amount=100_000)

        res = chain.execute(self.ct.claim_baker_rewards(fish), sender=fish)
        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 50_000)
        self.assertEqual(transfers[0]["destination"], fish)
        self.assertEqual(transfers[0]["source"], contract_self_address)