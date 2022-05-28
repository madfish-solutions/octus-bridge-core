type storage_t          is [@layout:comb] record [
  vault                   : address;
  protocol                : address;
  protocol_asset_id       : nat;
  metadata                : metadata_t;
  deposit_asset           : asset_standard_t;
	reward_asset            : asset_standard_t;
  balance                 : nat;
]

type return_t           is list (operation) * storage_t

type y_mint_t           is [@layout:comb] record [
  tokenId                 : nat;
  amount                  : nat;
  minReceived             : nat;
]

type invest_t           is [@layout:comb] record [
  amount                  : nat;
  min_received            : nat;
]