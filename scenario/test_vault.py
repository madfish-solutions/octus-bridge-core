from unittest import TestCase
from helpers import *
from constants import *

import json
from pprint import pprint

from pytezos import ContractInterface, MichelsonRuntimeError

CHAIN_ID = "7263566b706157554e657458645170"
RECEIVER = "1234567890"

class VaultTest(TestCase):
    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        text = open("./builds/vault.json").read()
        code = json.loads(text)
        cls.ct = ContractInterface.from_micheline(code["michelson"])

        storage = cls.ct.storage.dummy()
        storage["owner"] = admin
        storage["bridge"] = bridge
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

    def test_withdrawal_fee(self):
        chain = MockChain(storage=self.storage)

        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=555_000, asset=token_a_fa2))

        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 555_000)
        self.assertEqual(transfers[0]["destination"], contract_self_address)
        self.assertEqual(transfers[0]["source"], me)
        self.assertEqual(transfers[0]["token_address"], token_a_address)