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

type assets_t           is big_map(nat, asset_t)
type asset_ids_t        is big_map(asset_standard_t, nat)
type banned_assets_t    is big_map(asset_standard_t, bool)

type deposit_t          is [@layout:comb] record[
  recipient               : bytes;
  amount                  : nat;
  asset                   : asset_standard_t;
]

type deposits_t         is big_map(nat, deposit_t)

type storage_t          is [@layout:comb] record[
  owner                   : address;
  pending_owner           : option(address);
  bridge                  : address;
  fish                    : address;
  management              : address;
  guardian                : address;
  baker                   : key_hash;
  fees                    : vault_fees_t;
  assets                  : assets_t;
  asset_ids               : asset_ids_t;
  asset_count             : nat;
  asset_config            : asset_config_t;
  banned_assets           : banned_assets_t;

  deposits                : deposits_t;
  deposit_count           : nat;

  fee_balances            : big_map(asset_id_t, fee_balances_t);

  metadata                : metadata_t;
  paused                  : bool;
]

type return_t           is list (operation) * storage_t

type fee_per_asset_t    is [@layout:comb] record[
  asset_id                : nat;
  fee_f                  : nat;
]

type set_deposit_limit_t is [@layout:comb] record[
  asset_id                 : nat;
  deposit_limit            : nat;
]

type get_asset_return_t  is [@layout:comb] record[
  storage                  : storage_t;
  asset                    : asset_t;
  operations               : list(operation);
  asset_id                 : asset_id_t
]
