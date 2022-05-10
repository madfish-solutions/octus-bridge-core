type fees_t             is [@layout:comb] record[
  deposit_f               : nat;
  withdraw_f              : nat;
]

type vault_fees_t       is [@layout:comb] record[
  native                  : fees_t;
  aliens                  : fees_t;
]

type asset_config_t     is [@layout:comb] record[
  native                  : config_t;
  aliens                  : config_t;
]

type asset_t            is [@layout:comb] record[
  asset_type              : asset_standard_t;
  precision               : nat;
  deposit_fee_f           : nat;
  withdraw_fee_f          : nat;
  tvl                     : nat;
  virtual_balance         : nat;
  paused                  : bool;
  banned                  : bool;
]

type assets_t           is big_map(nat, asset_t)
type asset_ids_t        is big_map(asset_standard_t, nat)
type banned_assets_t    is big_map(asset_standard_t, bool)

type storage_t          is [@layout:comb] record[
  owner                   : address;
  pending_owner           : option(address);
  bridge                  : address;
  fish                    : address;
  management              : address;
  guardian                : address;
  baker                   : key_hash;
  deposit_limit           : nat;
  fees                    : vault_fees_t;
  assets                  : assets_t;
  asset_ids               : asset_ids_t;
  asset_config            : asset_config_t;
  banned_assets           : banned_assets_t;

  metadata                : metadata_t;
  paused                  : bool;
]

type return_t           is list (operation) * storage_t

type fee_per_asset_t    is [@layout:comb] record[
  asset_id                : nat;
  fee_f                  : nat;
]
