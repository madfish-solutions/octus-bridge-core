type fees_t             is [@layout:comb] record[
  deposit_f               : nat;
  withdraw_f              : nat;
]

type vault_fees_t       is [@layout:comb] record[
  native                  : fees_t;
  alien                   : fees_t;
]

type asset_config_t     is [@layout:comb] record[
  native                  : config_t;
  alien                   : config_t;
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
  asset_id                   : asset_id_t;
  pending_withdrawal_ids     : set(nat);
  expected_min_bounty        : nat;
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
  signatures              : signatures_t;
]

type withdrawals_t      is big_map(nat, withdrawal_t)
type withdrawal_ids_t   is big_map(bytes, nat)

type strategy_t         is [@layout:comb] record [
  asset                   : asset_standard_t;
  strategy_address        : address;
  tvl           : nat;

  (* The desirable % of all deposited assets that should be used in the strategy *)
  target_reserves_rate_f  : nat;

  (* The acceptable diff between the actual % of reserves
    in the strategy and the real % of assets in the strategy
    when the rebalance shouldn’t be triggered *)
  delta_f                 : nat;
]

type strategies_t       is big_map(asset_id_t, strategy_t)

type fee_balances_map_t is big_map(asset_id_t, fee_balances_t)

type pending_withdrawal_t is [@layout:comb] record[
  deposit_id              : bytes;
  asset                   : asset_standard_t;
  recipient               : address;
  amount                  : nat;
  fee                     : nat;
  bounty                  : nat;
  message                 : message_t;
  status                  : withdrawal_status_t;
]

type pending_withdrawals_t is big_map(nat, pending_withdrawal_t)

type storage_t          is [@layout:comb] record[
  owner                   : address;
  pending_owner           : option(address);
  bridge                  : address;
  fish                    : address;
  management              : address;
  guardian                : address;
  strategist              : address;
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

  strategies              : strategies_t;
  strategy_rewards        : fee_balances_map_t;

  pending_withdrawals     : pending_withdrawals_t;
  pending_count           : nat;
  pending_withdrawal_ids  : withdrawal_ids_t;

  fee_balances            : fee_balances_map_t;
  baker_rewards           : fee_balances_t;

  metadata                : metadata_t;
  emergency_shutdown      : bool;
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
  chain_id                : bytes;
  asset                   : asset_standard_t;
  amount                  : nat;
  recipient               : address;
  bounty                  : nat;
	metadata                : option(token_meta_t);
]

type claim_fee_t        is [@layout:comb] record[
  asset_id                : asset_id_t;
  recipient               : address;
]

type add_strategy_t     is [@layout:comb] record[
  asset_id                : asset_id_t;
  strategy_address        : address;

  target_reserves_rate_f  : nat;
  delta_f                 : nat;
]

type update_strategy_t  is [@layout:comb] record[
  asset_id                : asset_id_t;
  target_reserves_rate_f  : nat;
  delta_f                 : nat;
]

type revoke_strategy_t  is [@layout:comb] record[
  asset_id                : asset_id_t;
  delete                  : bool;
  data                    : bytes;
]

type set_bounty_t       is [@layout:comb] record[
  pending_id              : nat;
  bounty                  : nat;
]

type cancel_pending_withdrawal_t is [@layout:comb] record[
  pending_id              : nat;
  recipient               : bytes;
]

type maintain_t         is [@layout:comb] record[
  asset_id                : nat;
  data                    : bytes;
]

type action_t           is
| Set_owner               of address
| Set_bridge              of address
| Set_management          of address
| Set_fish                of address
| Set_guardian            of address
| Set_deposit_limit       of set_deposit_limit_t
| Set_fees                of vault_fees_t
| Set_asset_deposit_fee   of fee_per_asset_t
| Set_asset_withdraw_fee  of fee_per_asset_t
| Set_native_config       of config_t
| Set_alien_config        of config_t
| Toggle_ban_asset        of asset_standard_t
| Toggle_emergency_shutdown of unit
| Update_metadata         of metadata_t
| Delegate_tez            of option(key_hash)
| Claim_baker_rewards     of address
| Claim_fee               of claim_fee_t
| Claim_strategy_rewards  of claim_fee_t
| Confirm_owner           of unit
| Add_strategy            of add_strategy_t
| Update_strategy         of update_strategy_t
| Revoke_strategy         of revoke_strategy_t
| Handle_harvest          of harvest_response_t
| Maintain                of maintain_t
| Harvest                 of asset_id_t

| Deposit                 of deposit_t
| Deposit_with_bounty     of deposit_with_bounty_t
| Withdraw                of message_t
| Set_bounty              of set_bounty_t
| Cancel_withdrawal       of cancel_pending_withdrawal_t

| Default                 of unit

type vault_func_t       is (action_t * storage_t) -> return_t

type full_storage_t     is [@layout:comb] record [
  storage                 : storage_t;
  farm_lambdas            : big_map(nat, bytes);
]

type full_storage_t     is [@layout:comb] record [
  storage                 : storage_t;
  vault_lambdas           : big_map(nat, bytes);
]

type full_return_t      is (list(operation) * full_storage_t)

type setup_func_t       is [@layout:comb] record [
  index                   : nat;
  func                    : bytes;
]

type full_action_t      is
| Use                     of action_t
| Setup_func              of setup_func_t

[@inline] const vault_methods_max_index : nat = 30n;

[@inline] const no_operations     : list(operation) = nil;