module Errors is {
  (* Permission errors *)
  const not_owner               : string = "Bridge-core/not-owner";
  const not_pending_owner       : string = "Bridge-core/not-pending-owner";
  const not_submitter           : string = "Bridge-core/not-round-submitter";
  const bridge_paused           : string = "Bridge-core/bridge-paused";
  }