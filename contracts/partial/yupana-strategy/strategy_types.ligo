type storage_t          is [@layout:comb] record [
  owner                   : address;
  pending_owner           : option(address);
  vault                   : address;
  protocol                : address;
  protocol_asset_id       : nat;
  price_feed              : address;
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

type balance_view_t     is [@layout:comb] record [
  requests                : list(balance_of_request_t);
  precision               : bool;
]

