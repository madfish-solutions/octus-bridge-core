type token_id_t         is nat
type native_address_t   is bytes
type chain_id_t         is bytes

type token_t            is [@layout:comb] record[
  address                 : address;
  id                      : token_id_t;
]

type wrapped_token_t    is [@layout:comb] record[
  chain_id                : chain_id_t;
  native_token_address    : native_address_t;
]

type asset_standard_t is
| Fa12                    of address
| Fa2                     of token_t
| Tez
| Wrapped                 of token_t

type metadata_t         is map(string, bytes)

type token_metadata_t   is [@layout:comb] record [
  token_id                : token_id_t;
  token_info              : metadata_t;
]

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