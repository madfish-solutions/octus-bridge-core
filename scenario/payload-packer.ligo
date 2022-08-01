#include "../contracts/partial/common_types.ligo"
#include "../contracts/partial/common_constants.ligo"
#include "../contracts/partial/vault/vault_types.ligo"

type packer_action_t is
| Event of payload_t
| Withdrawal of withdrawal_data_t
| Nat of nat;

function main(
  const action          : packer_action_t;
  const _               : bytes)
                        : (list(operation) * bytes) is
  case action of [
  | Event(params) -> (Constants.no_operations, Bytes.pack(params))
  | Withdrawal(params) -> (Constants.no_operations, Bytes.pack(params))
  | Nat(params) -> (Constants.no_operations, Bytes.pack(params))
  ]
