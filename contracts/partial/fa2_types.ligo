type token_id_t         is nat

type transfer_destination_t is [@layout:comb] record[
  to_       : address;
  token_id  : nat;
  amount    : nat;
]

type transfer_param_t   is [@layout:comb] record [
  from_   : address;
  txs     : list (transfer_destination_t);
]

type transfer_params_t  is list(transfer_param_t)

type balance_of_request_t is [@layout:comb] record [
  owner       : address;
  token_id    : token_id_t;
]

type balance_of_response_t is [@layout:comb] record [
  request     : balance_of_request_t;
  balance     : nat;
]

type balance_params_t   is [@layout:comb] record [
  requests    : list (balance_of_request_t);
  callback    : contract (list (balance_of_response_t));
]

type operator_param_t   is [@layout:comb] record[
  owner     : address;
  operator  : address;
  token_id  : token_id_t;
]

type update_operator_param_t is
| Add_operator                 of operator_param_t
| Remove_operator              of operator_param_t

type update_operator_params_t is list(update_operator_param_t)

type fa2_transfer_param_t is [@layout:comb] record [
  from_                   : address;
  txs                     : list(transfer_destination_t);
]

type fa2_transfer_t     is list(fa2_transfer_param_t)

type fa12_transfer_t    is michelson_pair(address, "from", michelson_pair(address, "to", nat, "value"), "")