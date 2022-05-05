#include "../partial/common_types.ligo"
#include "../partial/common_constants.ligo"
#include "../partial/bridge-core/bridge_errors.ligo"
#include "../partial/bridge-core/bridge_types.ligo"
#include "../partial/common_helpers.ligo"
#include "../partial/common_methods.ligo"
#include "../partial/bridge-core/bridge_admin_methods.ligo"
#include "../partial/bridge-core/bridge_router.ligo"
#include "../partial/bridge-core/bridge_views.ligo"

function main(
  const action          : parameter_t;
  var s                 : storage_t)
                        : return_t is
  block {
    s := call_owner(action, s)
  } with case action of [
    | Confirm_owner(_)          -> confirm_owner(s)
    | Force_round_relay(params) -> force_round_relay(params, s)
    | _                         -> (Constants.no_operations, s)
  ]