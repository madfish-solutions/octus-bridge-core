PRECISION = 1_000_000

FAR_FUTURE = int(1e10)

distributor_asset = "KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ"
auction = "KT19kgnqC5VWoxktLRdRUERbyUPku9YioE8W"

token_a_address = "KT18amZmM5W7qDWVt2pH6uj7sCEd3kbzLrHT"
token_a_id = 19

token_b_address = "KT1AxaBxkFLCUi3f8rdDAAxBKHfzY8LfKDRA"
token_c_address = "KT1XXAavg3tTj12W1ADvd3EEnm1pu6XTmiEF"
 
deposit_token = "KT1PQ8TMzGMfViRq4tCMFKD2QF5zwJnY67Xn"
reward_token = "KT1X1LgNkQShpF9nRLYw3Dgdy4qp38MX617z"

bridge = "KT1LzyPS8rN375tC31WPAVHaQ4HyBvTSLwBu"

wrapped_token_address = "KT1LTqpmGJ11EebMVWAzJ7DWd9msgExvHM94"

token_a_fa12 = ("fa12", token_a_address)
token_a_fa2 = {
    "fa2": {
            "address": token_a_address,
            "id": token_a_id
        }
    }

token_b_fa2 = {
    "fa2": {
            "address": token_b_address,
            "id": 1
        }
    }
token_c_fa12 = ("fa12", token_c_address)

wrapped_asset_a = {
    "wrapped": {
        "address": wrapped_token_address,
        "id": 0,
    }
}

vr = {
    # f"{bridge}%validate_message": {("01", hashabledict({})): {"Message_valid" : None}}
    f"{bridge}%validate_message": "message_valid"
}

CHAIN_ID = "7263566b706157554e657458645170"
RECEIVER = "1234567890"

round_submitter = "KT1LzyPS8rN375tC31WPAVHaQ4HyBvTSLwBu"
quipu_token = "KT1LzyPS8rN375tC31WPAVHaQ4HyBvTSLwBu"
strategy = "KT1Qf46j2x37sAN4t2MKRQRVt9gc4FZ5duMs"

strategist = "tz1MDhGTfMQjtMYFXeasKzRWzkQKPtXEkSEw"
dummy_sig = "sigY3oZknG7z2N9bj5aWVtdZBakTviKnwbSYTecbbT2gwQDrnLRNhP5KDcLroggq71AjXWkx27nSLfS8rodS4DYn14FyueS5"

dev = "tz1fRXMLR27hWoD49tdtKunHyfy3CQb5XZst"

dummy_metadata = {
    "symbol": "0x01",
    "name": "0x02",
    "decimals": "0x03",
    "icon": "0x04",
}

fees = {
  "lp": 200_000,
  "stakers": 200_000,
  "ref": 500_000,
}

class Errors:
    PAST_DEADLINE = "'143'"
    DRAINED_PAIR = "'109'"
    LOW_TOKEN_A_IN = "'111'"
    LOW_TOKEN_B_IN = "'112'"
    HIGH_MIN_OUT = "'116'"
    WRONG_TEZ_AMOUNT = "'120'"

    AUCTION_INSUFFICIENT_BALANCE = "'307'"
    MIN_BID = "'308'"
    AUCTION_FINISHED = "'309'"
    
    NOT_A_NAT = "'406'"
