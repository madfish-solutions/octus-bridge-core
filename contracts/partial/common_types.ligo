type token_id_t         is nat
type asset_id_t         is nat
type native_address_t   is bytes
type chain_id_t         is bytes

type token_t            is [@layout:comb] record[
  address                 : address;
  id                      : token_id_t;
]

type source_address_t   is bytes

type asset_standard_t   is
| Fa12                    of address
| Fa2                     of token_t
| Tez
| Wrapped                 of token_t

type token_meta_t       is map(string, bytes)

type metadata_t         is big_map(string, bytes)

type mint_param_t       is [@layout:comb] record [
  token_id                : token_id_t;
  recipient               : address;
  amount                  : nat;
]

type mint_params_t      is list(mint_param_t)

type burn_params_t      is [@layout:comb] record [
  token_id                : token_id_t;
  account                 : address;
  amount                  : nat;
]

type payload_t          is [@layout:comb] record [
  event_transaction_lt    : nat;
  event_timestamp         : timestamp;
  event_data              : bytes;
  configuration_wid       : int;
  configuration_address   : nat;
  event_contract_wid      : int;
  event_contract_address  : nat;
  proxy                   : address;
  round                   : nat;
]

type message_status_t  is
| Round_greater_last_round
| Round_less_initial_round
| Not_enough_correct_signatures
| Round_outdated
| Bridge_paused
| Invalid_payload
| Message_valid

type signatures_t       is map(key, signature)

type message_t          is [@layout:comb] record[
  payload                 : bytes;
  signatures              : signatures_t;
]

type config_t           is [@layout:comb] record[
  configuration_wid       : int;
  configuration_address   : nat;
]

type asset_t            is [@layout:comb] record[
  asset_type              : asset_standard_t;
  deposit_fee_f           : nat;
  withdraw_fee_f          : nat;
  deposit_limit           : nat;
  tvl                     : nat;
  virtual_balance         : nat;
  paused                  : bool;
  banned                  : bool;
]

type fee_balances_t     is [@layout:comb] record[
  fish_f                  : nat;
  management_f            : nat;
]