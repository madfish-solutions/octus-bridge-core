from unittest import TestCase, skip
from helpers import *
from constants import *
from initial_storage import vault_lambdas

import json
from pprint import pprint

from pytezos import ContractInterface, MichelsonRuntimeError, Key

first_signer_key = Key.generate(curve=b'sp', export=False)
second_signer_key = Key.generate(curve=b'sp', export=False)
third_signer_key = Key.generate(curve=b'sp', export=False)

class BridgeTest(TestCase):
    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        text = open("./builds/bridge_core.json").read()
        code = json.loads(text)
        cls.ct = ContractInterface.from_micheline(code["michelson"])

        storage = cls.ct.storage.dummy()
        storage["owner"] = admin
        storage["rounds"] = {
            0 : {
                "end_time": 300,
                "ttl": 420,
                "relays": [
                    first_signer_key.public_key(),
                    second_signer_key.public_key()
                ],
                "required_signatures": 2
            }
        }
        cls.storage = storage

        packer = ContractInterface.from_michelson(open("./scenario/payload-packer.tz").read())
        cls.packer = packer

    def test_validate_message(self):
        chain = MockChain(storage=self.storage)

        payload = pack_withdraw_payload(self.packer, 222_000, alice, token_a_fa2, "01")

        message = {
            "payload": payload,
            "signatures" : {
                first_signer_key.public_key() : first_signer_key.sign(payload),
                second_signer_key.public_key() : second_signer_key.sign(payload)
            }
        }

        res = chain.view(self.ct.validate_message(**message))
        self.assertEqual(res, "message_valid")

    def test_cant_validate_same_signature(self):
        chain = MockChain(storage=self.storage)

        payload = pack_withdraw_payload(self.packer, 222_000, alice, token_a_fa2, "01")

        message = {
            "payload": payload,
            "signatures" : {
                first_signer_key.public_key() : first_signer_key.sign(payload),
                first_signer_key.public_key() : first_signer_key.sign(payload),
            }
        }

        res = chain.view(self.ct.validate_message(**message))
        self.assertEqual(res, "not_enough_correct_signatures")

    def test_cant_validate_wrong_signature(self):
        chain = MockChain(storage=self.storage)

        payload = pack_withdraw_payload(self.packer, 222_000, alice, token_a_fa2, "01")

        message = {
            "payload": payload,
            "signatures" : {
                first_signer_key.public_key() : first_signer_key.sign(payload),
                third_signer_key.public_key() : third_signer_key.sign(payload),
            }
        }

        res = chain.view(self.ct.validate_message(**message))
        self.assertEqual(res, "not_enough_correct_signatures")

    def test_no_signatures(self):
        chain = MockChain(storage=self.storage)

        payload = pack_withdraw_payload(self.packer, 222_000, alice, token_a_fa2, "01")

        message = {
            "payload": payload,
            "signatures" : {
                
            }
        }

        res = chain.view(self.ct.validate_message(**message))
        self.assertEqual(res, "not_enough_correct_signatures")


    def test_banned_signature(self):
        chain = MockChain(storage=self.storage)

        res = chain.execute(self.ct.toggle_ban_relay(first_signer_key.public_key()), sender=admin)

        payload = pack_withdraw_payload(self.packer, 222_000, alice, token_a_fa2, "01")

        message = {
            "payload": payload,
            "signatures" : {
                first_signer_key.public_key() : first_signer_key.sign(payload),
                second_signer_key.public_key() : second_signer_key.sign(payload)
            }
        }

        res = chain.view(self.ct.validate_message(**message))
        self.assertEqual(res, "not_enough_correct_signatures")

    @skip("Cant test due to pytezos onchain_view not accepting Tezos.now")
    def test_round_ttl(self):
        chain = MockChain(storage=self.storage)

        payload = pack_withdraw_payload(self.packer, 222_000, alice, token_a_fa2, "01")

        message = {
            "payload": payload,
            "signatures" : {
                first_signer_key.public_key() : first_signer_key.sign(payload),
                second_signer_key.public_key() : second_signer_key.sign(payload)
            }
        }

        chain.advance_blocks(100)

        res = chain.view(self.ct.validate_message(**message))
        self.assertEqual(res, "round_outdated")

