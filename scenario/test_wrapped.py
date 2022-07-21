from unittest import TestCase
from helpers import *
from constants import *
from initial_storage import vault_lambdas

import json
from pprint import pprint

from pytezos import ContractInterface, MichelsonRuntimeError, Key

first_signer_key = Key.generate(curve=b'sp', export=False)
second_signer_key = Key.generate(curve=b'sp', export=False)
third_signer_key = Key.generate(curve=b'sp', export=False)

class WrappedTest(TestCase):
    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        text = open("./builds/wrapped_token.json").read()
        code = json.loads(text)
        cls.ct = ContractInterface.from_micheline(code["michelson"])

        storage = cls.ct.storage.dummy()
        storage["owner"] = admin
        storage["vault"] = vault
        cls.storage = storage

        packer = ContractInterface.from_michelson(open("./scenario/payload-packer.tz").read())
        cls.packer = packer

    def test_mint_and_burn(self):
        chain = MockChain(storage=self.storage)

        chain.execute(self.ct.create_token({"" : ""}), sender=vault)

        chain.execute(self.ct.mint([{
            "token_id" : 0,
            "recipient" : alice,
            "amount" : 100_000_000
        }]), sender=vault)

        with self.assertRaises(MichelsonRuntimeError):
            chain.execute(self.ct.burn({
                "token_id" : 0,
                "account" : alice,
                "amount" : 100_000_001
            }), sender=vault)

        chain.execute(self.ct.mint([{
            "token_id" : 0,
            "recipient" : alice,
            "amount" : 100_000_000
        }]), sender=vault)

    def test_mint_and_transfer(self):
        chain = MockChain(storage=self.storage)

        chain.execute(self.ct.create_token({"" : ""}), sender=vault)

        chain.execute(self.ct.mint([{
            "token_id" : 0,
            "recipient" : alice,
            "amount" : 100_000_000
        }]), sender=vault)

        # bob doesn't have any money yet
        with self.assertRaises(MichelsonRuntimeError):
            chain.execute(self.ct.burn({
                "token_id" : 0,
                "account" : bob,
                "amount" : 1
            }), sender=vault)

        transfer = self.ct.transfer(
            [{ "from_" : alice,
                "txs" : [{
                    "amount": 100_000_000,
                    "to_": bob,
                    "token_id": 0
                }]
            }])
        chain.execute(transfer, sender=alice)

        # alice has nothing to burn
        with self.assertRaises(MichelsonRuntimeError):
            chain.execute(self.ct.burn({
                    "token_id" : 0,
                    "account" : alice,
                    "amount" : 1
            }), sender=vault)

        # bob can't burn more than he owns
        with self.assertRaises(MichelsonRuntimeError):
            chain.execute(self.ct.burn({
                    "token_id" : 0,
                    "account" : bob,
                    "amount" : 100_000_001
            }), sender=vault)
        
        chain.execute(self.ct.burn({
            "token_id" : 0,
            "account" : bob,
            "amount" : 100_000_000
        }), sender=vault)

        # can't burn anymore
        with self.assertRaises(MichelsonRuntimeError):
            chain.execute(self.ct.burn({
                    "token_id" : 0,
                    "account" : bob,
                    "amount" : 1
            }), sender=vault)