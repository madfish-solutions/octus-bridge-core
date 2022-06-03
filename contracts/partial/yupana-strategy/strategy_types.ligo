type storage_t          is [@layout:comb] record [
  vault                   : address;
  protocol                : address;
  protocol_asset_id       : nat;
  deposit_asset           : asset_standard_t;
	reward_asset            : asset_standard_t;
  tvl                     : nat;
  last_profit             : nat;
  metadata                : metadata_t;
]

type return_t           is list (operation) * storage_t

type call_y_t           is [@layout:comb] record [
  tokenId                 : nat;
  amount                  : nat;
  minReceived             : nat;
]

type invest_t           is [@layout:comb] record [
  amount                  : nat;
  min_received            : nat;
]

type divest_t           is invest_t

type balance_view_t     is [@layout:comb] record [
  requests                : list(balance_of_request_t);
  precision               : bool;
]