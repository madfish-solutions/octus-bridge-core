from os import urandom

from pytezos.crypto.encoding import base58_encode

BLOCK_TIME = 30

alice = "tz1iA1iceA1iceA1iceA1iceA1ice9ydjsaW"
bob = "tz1iBobBobBobBobBobBobBobBobBodTWLCX"
carol = "tz1iCaro1Caro1Caro1Caro1Caro1CbMUKN1"
dave = "tz1iDaveDaveDaveDaveDaveDaveDatFC4So"
julian = "tz1iJu1ianJu1ianJu1ianJu1ianJtvTftP8"
admin = "tz1iAdminAdminAdminAdminAdminAh4qKqu"

burn = "tz1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZNkiRg"

fish = "tz1XXPVLyQqsMVaQKnPWvD4q6nVwgwXUG4Fp"
management = "tz1hh9w4wnB7xLuGRvqwzWxc7A5ngrVTAPGT"

# the same as Pytezos' contract.context.get_self_address()
contract_self_address = 'KT1BEqzn5Wx8uJrZNvuS9DVHmLvG9td3fDLi'

# the same as Pytezos' `contract.context.get_sender()`. The default Tezos.sender
me = "tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU"

burn = "tz1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZNkiRg"

proxy = "KT1Mjjcb6tmSsLm7Cb3DSQszePjfchPM4Uxm"

deadline = 100_000

def format_number(data_value, indx):
    if data_value >= 1_000_000:
        formatter = '{:1.1f}M'.format(data_value*0.000_001)
    else:
        formatter = '{:1.0f}K'.format(data_value*0.001)
    return formatter

def print_pool_stats(res):
    print("\n")
    print("token_pool:", res.storage["storage"]["token_pool"])
    print("tez_pool", res.storage["storage"]["tez_pool"])

def get_pool_stats(res):
    token_pool = res.storage["storage"]["token_pool"]
    tez_pool = res.storage["storage"]["tez_pool"]
    return (tez_pool, token_pool)

def calc_shares(token_a, token_b):
    return token_a if token_a < token_b else token_b

def calc_out(amount_in, pool_a, pool_b, fee):
    tez_in_with_fee = amount_in * fee
    numerator = tez_in_with_fee * pool_b
    denominator = pool_a * int(1e18) + tez_in_with_fee

    return numerator // denominator

def calc_pool_rate(res, pair=-1):
    if pair != -1: #token to token case
        pair_storage = res.storage["storage"]["pairs"][pair]
        token_a_pool = pair_storage["token_a_pool"]
        token_b_pool = pair_storage["token_b_pool"]
        return token_a_pool / token_b_pool


    token_pool = res.storage["storage"]["token_pool"]
    tez_pool = res.storage["storage"]["tez_pool"]
    return tez_pool / token_pool
    

def parse_tez_transfer(op):
    dest = op["destination"]
    amount = int(op["amount"])
    source = op["source"]
    return {
        "type": "tez", 
        "destination": dest,
        "amount": amount,
        "source": source
    }

def parse_as_fa12(value):
    args = value["args"]

    return {
        "type": "token",
        "amount": int(args[2]["int"]),
        "destination": args[1]["string"],
        "source": args[0]["string"]
    }

def parse_as_fa2(values):
    result = []
    for value in values:
        source = value["args"][0]["string"]
        transfers = value["args"][1]
        for transfer in transfers:
            args = transfer["args"]

            amount = args[-1]["int"]
            amount = int(amount)

            token_id = args[1]["int"]
            token_id = int(token_id)

            dest = args[0]["string"]

            result.append({
                "type": "token",
                "token_id": token_id,
                "destination": dest,
                "amount": amount,
                "source": source
            })

    return result

def parse_originations(res):
    originations = []
    for op in res.operations:
        if op["kind"] == "origination":
            orig = {
                "balance": int(op["balance"])
            }
            originations.append(orig)
    return originations

def parse_strategy_ops(res):
    result = []
    for op in res.operations:
        if op["kind"] == "transaction":
            ep = op["parameters"]["entrypoint"]
            if ep == "invest":
                invest = {
                    "amount": int(op["parameters"]["value"]["int"]),
                    "type": "invest"
                }
                result.append(invest)
            elif ep == "divest":
                divest = {
                    "amount": int(op["parameters"]["value"]["int"]),
                    "type": "divest"
                }
                result.append(divest)
            
    return result

def parse_mints(res):
    mints = []
    for op in res.operations:
        if op["kind"] == "transaction":
            if op["parameters"]["entrypoint"] == "mint":
                # mint = parse_mint_list(op)
                mint = {
                    "token_address": op["destination"],
                    "destination": op["parameters"]["value"]["string"]
                }
                mints.append(mint)
    return mints

def parse_mint_list(op):
    list = []
    values = op["parameters"]["value"]
    for value in values:
        args = value["args"]
        dest = args[0]["string"]
        amount = int(args[1]["int"])
        list.append({
            "type": "mint",
            "amount": amount,
            "destination": dest,
            "token_address": "fa12_dummy",
        })
    return list

def parse_transfers(res):
    transfers = []
    for op in res.operations:
        if op["kind"] == "transaction":
            entrypoint = op["parameters"]["entrypoint"]
            if entrypoint == "default":
                tx = parse_tez_transfer(op)
                transfers.append(tx)
            elif entrypoint == "transfer":
                txs = parse_transfer(op)
                transfers += txs

    return transfers

def parse_transfer(op):
    transfers = []
    value = op["parameters"]["value"]
    if not isinstance(value, list):
        transfer = parse_as_fa12(value)
        transfers.append(transfer)
    else:
        transfers += parse_as_fa2(value)

    for transfer in transfers:
        transfer["token_address"] = op["destination"]

    return transfers

def parse_validations(res):
    delegates = []
    for op in res.operations:
         if op["kind"] == "transaction":
            entrypoint = op["parameters"]["entrypoint"]
            if entrypoint == "validate":
                delegates.append(op["parameters"]["value"]["string"])
    return delegates

def parse_delegations(res):
    delegates = []
    for op in res.operations:
         if op["kind"] == "delegation":
            delegates.append(op["delegate"])
    return delegates

def parse_vote(op):
    args = op["parameters"]["value"]["args"]

    res = {
        "type": "vote",
        "delegate": args[1]["string"],
        "amount": int(args[3]["int"])
    }
    
    return res

def parse_votes(res):
    result = []

    for op in res.operations:
        if op["kind"] == "transaction":
            entrypoint = op["parameters"]["entrypoint"]
            if entrypoint == "vote":
                tx = parse_vote(op)
                result.append(tx)

    return result

def parse_ops(res):
    result = []
    for op in res.operations:
        if op["kind"] == "transaction":
            entrypoint = op["parameters"]["entrypoint"]
            if entrypoint == "default":
                tx = parse_tez_transfer(op)
                result.append(tx)
            elif entrypoint == "transfer":
                txs = parse_transfer(op)
                result += txs
            elif entrypoint == "close":
                result.append({"type" : "close"})
    return result

def parse_auction_ops(res):
    result = []

    for op in res.operations:
        if op["kind"] == "transaction":
            entrypoint = op["parameters"]["entrypoint"]
            if entrypoint == "receive_fee":
                tx = parse_auction_receive_fee(op)
                result.append(tx)

    return result

def parse_auction_receive_fee(op):
    args = op["parameters"]["value"]["args"]

    res = {
        "type": "receive_fee",
        # "token_address": args[1]["string"],
        "fee": int(args[1]["int"]),
        "destination": op["destination"]
    }
    
    return res

def parse_flash_swap_callbacks(res):
    ops = fetch_entrypoints(res, "flash_swap_callback")
    results = []
    
    for op in ops:
        args = op["parameters"]["value"]["args"]

        result = {
            "type": "flash_swap_callback",
            "pair_id": int(args[0]["int"]),
            "prev_tez_balance": int(args[1]["int"]),
            "amount_in": int(args[2]["int"])
        }

        results.append(result)
    
    return results

def fa2_transfer(from_, to_, amount, token_id):
    return [{ "from_" : from_,
                "txs" : [{
                    "amount": amount,
                    "to_": to_,
                    "token_id": token_id
                }]
            }]

def fetch_entrypoints(res, name):
    result = []
    for op in res.operations:
        if op["kind"] == "transaction":
            entrypoint = op["parameters"]["entrypoint"]
            if entrypoint == name:
                result.append(op)
    return result

# calculates shares balance
def calc_total_balance(res, address):
    ledger = res.storage["storage"]["ledger"][address]
    return ledger["balance"] + ledger["frozen_balance"]

def generate_random_address() -> str:
    return base58_encode(urandom(20), b'tz1').decode()

def get_shares(res, pool, user):
    storage = res.storage["storage"]
    return storage["ledger"][(user, pool)]

def get_reserves(res, pool):
    storage = res.storage["storage"]
    tokens = storage["pools"][pool]["tokens_info"]
    reserves = {}
    for (token_idx, token) in tokens.items():
        reserves[token_idx] = token["reserves"]
    return reserves

def operator_add(owner, operator, token_id=0):
    return {
        "add_operator": {
            "owner": owner,
            "operator": operator,
            "token_id": token_id
        }
    }

def pack_withdraw_payload(packer, amount, recipient, asset, deposit_id="01", bounty=0):
    withdraw_bytes = packer.withdrawal({
        "deposit_id"              : deposit_id,
        "asset"                   : asset,
        "amount"                  : amount,
        "recipient"               : recipient,
        "bounty"                  : bounty,
        "metadata"                : None,
    }).interpret().storage

    payload = packer.event({
        "event_transaction_lt"    : 0,
        "event_timestamp"         : 0,
        "event_data"              : withdraw_bytes,
        "configuration_wid"       : 0,
        "configuration_address"   : 0,
        "event_contract_wid"      : 0,
        "event_contract_address"  : 0,
        "proxy"                   : proxy,
        "round"                   : 0,  
    }).interpret().storage

    return payload

def skip_nones(d) -> dict:
    return {k: v for k, v in d.items() if v is not None}

class MockChain():
    def __init__(self, storage):
        self.storage = storage

        self.balance = 0
        self.now = 0
        self.level = 0
        self.payouts = {}
        self.contract_balances = {}
        self.last_res = None

    """ execute the entrypoint and save the resulting state and balance updates """
    def execute(self, call, amount=0, sender=None, source=None, view_results=None):
        new_balance = self.balance + amount
        res = call.interpret(
            amount=amount,
            storage=self.storage,
            balance=new_balance,
            now=self.now,
            sender=sender,
            source=source,
            view_results=view_results,
            level=self.level
        )
        self.balance = new_balance

        res.storage["storage"]["strategies"] = skip_nones(res.storage["storage"]["strategies"])

        self.storage = res.storage

        # calculate total xtz payouts from contract
        ops = parse_ops(res)
        for op in ops:
            if op["type"] == "tez":
                dest = op["destination"]
                amount = op["amount"]
                self.payouts[dest] = self.payouts.get(dest, 0) + amount

                # reduce contract balance in case it has sent something
                if op["source"] == contract_self_address:
                    self.balance -= op["amount"]
                    
            elif op["type"] == "token":
                dest = op["destination"]
                amount = op["amount"]
                address = op["token_address"]
                if address not in self.contract_balances:
                    self.contract_balances[address] = {}
                contract_balance = self.contract_balances[address]
                if dest not in contract_balance:
                    contract_balance[dest] = 0
                contract_balance[dest] += amount
                # TODO source funds removal  

        return res

    """ just interpret, don't store anything """
    def interpret(self, call, amount=0, sender=None, source=None, view_results=None):
        res = call.interpret(
            amount=amount,
            storage=self.storage,
            balance=self.balance,
            now=self.now,
            sender=sender,
            source=source,
            view_results=view_results,
            level=self.level
        )
        return res

    """ just view, don't store anything """
    def view(self, call, view_results=None):
        res = call.onchain_view(
            storage=self.storage,
            balance=self.balance,
            view_results=view_results
        )
        return res

    def advance_blocks(self, count=1):
        self.now += count * BLOCK_TIME
        self.level += count
