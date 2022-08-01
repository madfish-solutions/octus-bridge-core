
from unittest import TestCase
import json
from pprint import pprint
from constants import *

from helpers import *

from initial_storage import vault_lambdas

from pytezos import ContractInterface, MichelsonRuntimeError

class StrategyTest(TestCase):

    @classmethod
    def setUpClass(cls):
        text = open("./builds/vault.json").read()
        code = json.loads(text)
        cls.ct = ContractInterface.from_micheline(code["michelson"])

        storage = cls.ct.storage.dummy()
        storage["storage"]["owner"] = admin
        storage["storage"]["bridge"] = bridge
        storage["storage"]["strategist"] = strategist
        storage["vault_lambdas"] = vault_lambdas
        cls.storage = storage

        packer = ContractInterface.from_michelson(open("./scenario/payload-packer.tz").read())
        cls.packer = packer
        cls.packed_nat_one = packer.nat(1).interpret().storage

    def test_strategy_maintain(self):
        chain = MockChain(storage=self.storage)

        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=600_000, asset=token_a_fa2))

        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 600_000)
        self.assertEqual(transfers[0]["destination"], contract_self_address)
        self.assertEqual(transfers[0]["source"], me)
        self.assertEqual(transfers[0]["token_address"], token_a_address)

        # no strategy available
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.ct.maintain(0, self.packed_nat_one), sender=strategist, view_results=vr)
        
        res = chain.execute(self.ct.add_strategy(0, strategy, int(0.5 * PRECISION), int(0.1 * PRECISION)), sender=strategist, view_results=vr)
        
        # pools are now 300:300
        res = chain.execute(self.ct.maintain(0, self.packed_nat_one), sender=strategist, view_results=vr)
        st_ops = parse_strategy_ops(res)
        self.assertEqual(st_ops[0]["type"], "invest")
        self.assertEqual(st_ops[0]["amount"], 300_000)

        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=50_000, asset=token_a_fa2))

        # nothing to rebalance yet
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.ct.maintain(0, self.packed_nat_one), sender=strategist, view_results=vr)

        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=150_000, asset=token_a_fa2))

        # invest 100k so they are now both 400:400
        res = chain.execute(self.ct.maintain(0, self.packed_nat_one), sender=strategist, view_results=vr)
        st_ops = parse_strategy_ops(res)
        self.assertEqual(st_ops[0]["type"], "invest")
        self.assertEqual(st_ops[0]["amount"], 100_000)

        res = chain.execute(self.ct.revoke_strategy(0, True, self.packed_nat_one), sender=strategist, view_results=vr)
        st_ops = parse_strategy_ops(res)
        self.assertEqual(st_ops[0]["type"], "divest")
        self.assertEqual(st_ops[0]["amount"], 400_000)

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.ct.revoke_strategy(0, False, self.packed_nat_one), sender=strategist, view_results=vr)

    def test_strategy_harvest(self):
        chain = MockChain(storage=self.storage)

        res = chain.execute(self.ct.deposit(recipient=RECEIVER, amount=600_000, asset=token_a_fa2))

        transfers = parse_transfers(res)
        self.assertEqual(len(transfers), 1)
        self.assertEqual(transfers[0]["amount"], 600_000)
        self.assertEqual(transfers[0]["destination"], contract_self_address)
        self.assertEqual(transfers[0]["source"], me)
        self.assertEqual(transfers[0]["token_address"], token_a_address)
        
        res = chain.execute(self.ct.add_strategy(0, strategy, int(0.5 * PRECISION), int(0.1 * PRECISION)), sender=strategist, view_results=vr)

        # pools are now 300:300
        res = chain.execute(self.ct.maintain(0, self.packed_nat_one), sender=strategist, view_results=vr)
        st_ops = parse_strategy_ops(res)
        self.assertEqual(st_ops[0]["type"], "invest")
        self.assertEqual(st_ops[0]["amount"], 300_000)

