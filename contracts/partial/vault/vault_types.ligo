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

type deposit_with_bounty_t is [@layout:comb] record[
  recipient                  : bytes;
  amount                     : nat;
  asset                      : asset_standard_t;
  pending_withdrawal_id      : nat;
]

type deposits_t         is big_map(nat, deposit_t)

type withdrawal_status_t is
| Completed
| Pending
| Canceled

type withdrawal_t       is [@layout:comb] record[
  deposit_id              : bytes;
  asset                   : asset_standard_t;
  amount                  : nat;
  recipient               : address;
	metadata                : option(token_meta_t);
  signatures              : signatures_t;
]

type withdrawals_t      is big_map(nat, withdrawal_t)
type withdrawal_ids_t   is big_map(bytes, nat)

type pending_withdrawal_t is [@layout:comb] record[
  deposit_id              : bytes;
  asset                   : asset_standard_t;
  amount                  : nat;
  fee                     : nat;
  recipient               : address;
	metadata                : option(token_meta_t);
  bounty                  : nat;
  message                 : message_t;
  status                  : withdrawal_status_t;
]

type pending_withdrawals_t is big_map(nat, pending_withdrawal_t)

type fee_balances_map_t is big_map(asset_standard_t, fee_balances_t)

type storage_t          is [@layout:comb] record[
  owner                   : address;
  pending_owner           : option(address);
  bridge                  : address;
  fish                    : address;
  management              : address;
  guardian                : address;
  fees                    : vault_fees_t;
  assets                  : assets_t;
  asset_ids               : asset_ids_t;
  asset_count             : nat;
  asset_config            : asset_config_t;
  banned_assets           : banned_assets_t;

  deposits                : deposits_t;
  deposit_count           : nat;
  withdrawals             : withdrawals_t;
  withdrawal_count        : nat;
  withdrawal_ids          : withdrawal_ids_t;

  pending_withdrawals     : pending_withdrawals_t;
  pending_count           : nat;
  pending_withdrawal_ids  : withdrawal_ids_t;

  fee_balances            : fee_balances_map_t;
  baker_rewards           : fee_balances_t;

  metadata                : metadata_t;
  paused                  : bool;
]

type return_t           is list (operation) * storage_t

type fee_per_asset_t    is [@layout:comb] record[
  asset_id                : nat;
  fee_f                   : nat;
]

type set_deposit_limit_t is [@layout:comb] record[
  asset_id                 : nat;
  deposit_limit            : nat;
]

type get_asset_return_t is [@layout:comb] record[
  storage                 : storage_t;
  asset                   : asset_t;
  operations              : list(operation);
  asset_id                : asset_id_t;
]

type withdrawal_data_t  is [@layout:comb] record[
  deposit_id              : bytes;
  asset                   : asset_standard_t;
  amount                  : nat;
  recipient               : address;
  bounty                  : nat;
	metadata                : option(token_meta_t);
]

type claim_fee_t        is [@layout:comb] record[
  asset                   : asset_standard_t;
  recipient               : address;
]

type set_bounty_t       is [@layout:comb] record[
  pending_id              : nat;
  bounty                  : nat;
]

[@inline] const no_operations     : list(operation) = nil;