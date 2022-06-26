#include "../partial/common_types.ligo"
#include "../partial/common_constants.ligo"
#include "../partial/vault/vault_errors.ligo"
#include "../partial/vault/vault_types.ligo"
#include "../partial/common_helpers.ligo"
#include "../partial/common_methods.ligo"
#include "../partial/fa2_types.ligo"
#include "../partial/fa2_helpers.ligo"
#include "../partial/vault/vault_helpers.ligo"
#include "../partial/vault/vault_methods.ligo"
#include "../partial/vault/vault_admin_lambdas.ligo"
#include "../partial/vault/vault_lambdas.ligo"


function main(
  const action          : full_action_t;
  const s               : full_storage_t)
                        : full_return_t is
  case action of [
  | Use(params)         -> call_vault(params, s)
  | Setup_func(params)  -> setup_func(params, s)
  ]