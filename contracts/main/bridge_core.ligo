#include "../partial/common_types.ligo"
#include "../partial/common_constants.ligo"
#include "../partial/bridge-core/bridge_errors.ligo"
#include "../partial/bridge-core/bridge_types.ligo"
#include "../partial/common_helpers.ligo"
#include "../partial/common_methods.ligo"
#include "../partial/bridge-core/bridge_admin_methods.ligo"
#include "../partial/bridge-core/bridge_router.ligo"
#include "../partial/bridge-core/bridge_views.ligo"

type full_action_t is
| Use_owner             of owner_parameter_t
| Common                of common_parameter_t

function main(
  const action          : full_action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    s := case action of [
      | Use_owner(params) -> call_owner(params, s)
      | Common(params) -> call_common(params, s)
      | _ -> s
    ]
  } with (Constants.no_operations, s)