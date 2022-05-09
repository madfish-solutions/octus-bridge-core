
type fees_t             is [@layout:comb] record[
  deposit                 : nat;
  withdraw                : nat;
]

type asset_t            is [@layout:comb] record[
  asset_type              : asset_standard_t;
  precision               : nat;
  tvl                     : nat;
  virtual_balance         : nat;
  paused                  : bool;
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
  fees                    : fees_t;
  assets                  : assets_t;
  asset_ids               : asset_ids_t;
  banned_assets           : banned_assets_t;

  metadata                : metadata_t;
  paused                  : bool;
]

type return_t           is list (operation) * storage_t
