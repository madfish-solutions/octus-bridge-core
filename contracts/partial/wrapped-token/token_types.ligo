type ledger_key_t       is (address * nat)

type ledger_t           is big_map(ledger_key_t, nat)

type allowances_t       is big_map(ledger_key_t, set(address))

type token_metadata_t   is [@layout:comb] record [
  token_id                : token_id_t;
  token_info              : map(string, bytes);
]

type storage_t          is [@layout:comb] record [
  owner                   : address;
  pending_owner           : option(address);
  vault                   : address;
  ledger                  : ledger_t;
  allowances              : allowances_t;
  tokens_supply           : big_map(token_id_t, nat);
  token_count             : nat;
  metadata                : metadata_t;
  token_metadata          : big_map(token_id_t, token_metadata_t);
]

type return_t           is list(operation) * storage_t

type new_token_t        is map(string, bytes)
