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
        storage["storage"]["guardian"] = guardian
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

    def test_vault_fees(self):
        chain = MockChain(storage=self.storage)

        fees = {
            "deposit_f": int(0.05 * PRECISION),
            "withdraw_f": int(0.05 * PRECISION),
        }
        chain.execute(self.ct.set_fees(native=fees, alien=fees), sender=admin)

        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=777_666_000, asset=token_a_fa2))

        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 777_666_000)
        self.assertEqual(transfers[0]["destination"], contract_self_address)
        self.assertEqual(transfers[0]["source"], me)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        # claim deposit fees
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

        # claim withdraw fees
        res = chain.execute(self.ct.claim_fee(asset_id=0, recipient=fish), sender=fish)
        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 8_350)
        self.assertEqual(transfers[0]["destination"], fish)
        self.assertEqual(transfers[0]["source"], contract_self_address)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        res = chain.execute(self.ct.claim_fee(asset_id=0, recipient=management), sender=management)
        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 8_350)
        self.assertEqual(transfers[0]["destination"], management)
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
        payload = pack_withdraw_payload(self.packer, 170_000, alice, token_a_fa2, "01", 5)
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=alice, view_results=vr)

        # no transfers done, so it must have been added to pending list
        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 0)

        with self.assertRaises(MichelsonRuntimeError) as error:
            res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=160_000, asset_id=0, pending_withdrawal_ids=[0], expected_min_bounty=1))
        
        res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=200_000, asset_id=0, pending_withdrawal_ids=[0], expected_min_bounty=1), sender=bob)
        transfers = parse_transfers(res)

        self.assertEqual(len(transfers), 2) 
        self.assertEqual(transfers[0]["amount"], 200_000)
        self.assertEqual(transfers[0]["destination"], contract_self_address)
        self.assertEqual(transfers[0]["source"], bob)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        self.assertEqual(transfers[1]["amount"], 170_000 - 5)
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
            res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=200_000, asset_id=0, pending_withdrawal_ids=[0], expected_min_bounty=1), sender=bob)
            transfers = parse_transfers(res)

    def test_multiple_deposit_with_bounty(self):
        chain = MockChain(storage=self.storage)

        payload = pack_withdraw_payload(self.packer, 170_000, alice, token_a_fa2, "01", 600)
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=alice, view_results=vr)

        payload = pack_withdraw_payload(self.packer, 50_000, bob, token_a_fa2, "02", 100)
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=bob, view_results=vr)

        # too low to cover both withdraws
        with self.assertRaises(MichelsonRuntimeError) as error:
            res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=210_000, asset_id=0, pending_withdrawal_ids=[0, 1], expected_min_bounty=1), sender=carol)
        
        res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=220_000, asset_id=0, pending_withdrawal_ids=[0, 1], expected_min_bounty=1), sender=carol)
        transfers = parse_transfers(res)

        # also ensures taking funds from depositor goes first
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
            res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=230_000, asset_id=0, pending_withdrawal_ids=[0, 1], expected_min_bounty=1), sender=carol)

    def test_multiple_deposit_with_bounty_fees(self):
        chain = MockChain(storage=self.storage)

        fees = {
            "deposit_f": int(0.05 * PRECISION),
            "withdraw_f": int(0.01 * PRECISION),
        }
        chain.execute(self.ct.set_fees(native=fees, alien=fees), sender=admin)

        payload = pack_withdraw_payload(self.packer, 170_000, alice, token_a_fa2, "01", 500)

        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=alice, view_results=vr)

        payload = pack_withdraw_payload(self.packer, 50_000, bob, token_a_fa2, "02", 100)
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=bob, view_results=vr)

        with self.assertRaises(MichelsonRuntimeError) as error:
            res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=220_000 - 2201, asset_id=0, pending_withdrawal_ids=[0, 1], expected_min_bounty=1), sender=carol)
        
        res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=220_000 - 2200, asset_id=0, pending_withdrawal_ids=[0, 1], expected_min_bounty=1), sender=carol)
        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 3) 
        self.assertEqual(transfers[0]["amount"], 220_000 - 2200)
        self.assertEqual(transfers[0]["destination"], contract_self_address)
        self.assertEqual(transfers[0]["source"], carol)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        self.assertEqual(transfers[1]["amount"], 50_000 - 100 - 500)
        self.assertEqual(transfers[1]["source"], contract_self_address)
        self.assertEqual(transfers[1]["destination"], bob)
        self.assertEqual(transfers[1]["token_address"], token_a_address)
    
        self.assertEqual(transfers[2]["amount"], 170_000 - 500 - 1700)
        self.assertEqual(transfers[2]["source"], contract_self_address)
        self.assertEqual(transfers[2]["destination"], alice)
        self.assertEqual(transfers[2]["token_address"], token_a_address)

        deposit_fee = 10890
        withdraw_fees = 1700 + 500

        with self.assertRaises(MichelsonRuntimeError) as error:
            res = chain.execute(self.ct.claim_fee(asset_id=0, recipient=fish), sender=fish)

        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=100_000, asset=token_a_fa2), sender=alice)
        helper_deposit_fee = 5000    

        res = chain.execute(self.ct.claim_fee(asset_id=0, recipient=fish), sender=fish)    

        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], (deposit_fee + withdraw_fees + helper_deposit_fee) // 2)
        self.assertEqual(transfers[0]["destination"], fish)
        self.assertEqual(transfers[0]["source"], contract_self_address)
        self.assertEqual(transfers[0]["token_address"], token_a_address)


    def test_multiple_deposit_with_wrong_asset(self):
        chain = MockChain(storage=self.storage)

        payload = pack_withdraw_payload(self.packer, 170_000, alice, token_a_fa2, "01", 600)
        chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=alice, view_results=vr)

        payload = pack_withdraw_payload(self.packer, 50_000, bob, token_b_fa2, "02", 100)
        chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=bob, view_results=vr)

        with self.assertRaises(MichelsonRuntimeError) as error:
            chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=220_000, asset_id=0, pending_withdrawal_ids=[0, 1], expected_min_bounty=1), sender=carol)

    def test_baking_rewards(self):
        chain = MockChain(storage=self.storage)

        res = chain.execute(self.ct.default(), amount=100_000)

        res = chain.execute(self.ct.claim_baker_rewards(fish), sender=fish)
        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 50_000)
        self.assertEqual(transfers[0]["destination"], fish)
        self.assertEqual(transfers[0]["source"], contract_self_address)

    def test_case_toggle_emergency_shutdown(self):
        chain = MockChain(storage=self.storage)
        
        # before shutdown
        with self.assertRaises(MichelsonRuntimeError):
            chain.execute(self.ct.toggle_emergency_shutdown(), sender=alice)

        chain.interpret(self.ct.toggle_emergency_shutdown(), sender=guardian)

        chain.execute(self.ct.toggle_emergency_shutdown(), sender=admin)

        # after shutdown
        # alice still can't
        with self.assertRaises(MichelsonRuntimeError):
            chain.execute(self.ct.toggle_emergency_shutdown(), sender=alice)

        # not even guardian can do that
        with self.assertRaises(MichelsonRuntimeError):
            chain.execute(self.ct.toggle_emergency_shutdown(), sender=guardian)

        chain.execute(self.ct.toggle_emergency_shutdown(), sender=admin)
    
    def test_vault_wrapped_fees(self):
        chain = MockChain(storage=self.storage)

        fees = {
            "deposit_f": 0,
            "withdraw_f": int(0.05 * PRECISION),
        }
        chain.execute(self.ct.set_fees(native=fees, alien=fees), sender=admin)

        payload = pack_withdraw_payload(self.packer, 100_000, alice, wrapped_asset_a, "01")
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), view_results=vr)

        mints = parse_mints(res)
        self.assertEqual(len(mints), 1)
        self.assertEqual(mints[0]["amount"], 95_000)
        self.assertEqual(mints[0]["destination"], alice)
        self.assertEqual(mints[0]["type"], "mint")
        self.assertEqual(mints[0]["token_address"], wrapped_token_address)

        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=95_000, asset=wrapped_asset_a), sender=alice)
        mints = parse_mints(res)
        self.assertEqual(len(mints), 1)
        self.assertEqual(mints[0]["amount"], 95_000)
        self.assertEqual(mints[0]["type"], "burn")
        self.assertEqual(mints[0]["token_address"], wrapped_token_address)

        res = chain.execute(self.ct.claim_fee(asset_id=0, recipient=fish), sender=fish)
        mints = parse_mints(res)
        self.assertEqual(len(mints), 1)
        self.assertEqual(mints[0]["amount"], 2_500)
        self.assertEqual(mints[0]["destination"], fish)
        self.assertEqual(mints[0]["token_address"], wrapped_token_address)

        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=2_500, asset=wrapped_asset_a), sender=fish)

    def test_vault_tvl_alien_token(self):
        chain = MockChain(storage=self.storage)

        fees = {
            "deposit_f": int(0.01 * PRECISION),
            "withdraw_f": int(0.10 * PRECISION),
        }
        chain.execute(self.ct.set_fees(native=fees, alien=fees), sender=admin)

        payload = pack_withdraw_payload(self.packer, 300_000, alice, token_a_fa2, "01", 0)
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=alice, view_results=vr)

        payload = pack_withdraw_payload(self.packer, 50_000, bob, token_a_fa2, "02", 0)
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=bob, view_results=vr)
        
        # we need a value so it is 350_000 after subtracting 1% so it covers first deposit fee, and then both withdrawal fees
        res = chain.execute(self.ct.deposit_with_bounty(recipient=RECEIVER, amount=353_536, asset_id=0, pending_withdrawal_ids=[0, 1], expected_min_bounty=0), sender=bob)
    
        res = chain.execute(self.ct.claim_fee(asset_id=0, recipient=fish), sender=fish)
        res = chain.execute(self.ct.claim_fee(asset_id=0, recipient=management), sender=management)

        self.assertEqual(res.storage["storage"]["assets"][0]["tvl"], 0)

    def test_vault_tvl_wrapped_token(self):
        chain = MockChain(storage=self.storage)

        fees = {
            "deposit_f": int(0.01 * PRECISION),
            "withdraw_f": int(0.10 * PRECISION),
        }
        chain.execute(self.ct.set_fees(native=fees, alien=fees), sender=admin)

        payload = pack_withdraw_payload(self.packer, 300_000, alice, wrapped_asset_a, "01")
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=alice, view_results=vr)

        payload = pack_withdraw_payload(self.packer, 50_000, bob, wrapped_asset_a, "02")
        res = chain.execute(self.ct.withdraw(payload=payload, signatures={}), sender=alice, view_results=vr)
        
        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=315_000, asset=wrapped_asset_a), sender=bob)
    
        res = chain.execute(self.ct.claim_fee(asset_id=0, recipient=fish), sender=fish)
        mints = parse_mints(res)
        self.assertEqual(len(mints), 1) 
        self.assertEqual(mints[0]["amount"], (35_000 + 3150) // 2)

        res = chain.execute(self.ct.claim_fee(asset_id=0, recipient=management), sender=management)
        mints = parse_mints(res)
        self.assertEqual(len(mints), 1) 
        self.assertEqual(mints[0]["amount"], (35_000 + 3150) // 2)

        self.assertEqual(res.storage["storage"]["assets"][0]["tvl"], 35_000 + 3150)


