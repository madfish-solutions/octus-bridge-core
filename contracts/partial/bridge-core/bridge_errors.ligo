module Errors is {
  (* Permission errors *)
  const not_owner               : string = "Bridge-core/not-owner";
  const not_pending_owner       : string = "Bridge-core/not-pending-owner";
  const not_submitter           : string = "Bridge-core/not-round-submitter";
  const bridge_paused           : string = "Bridge-core/bridge-paused";
  const round_undefined         : string = "Bridge-core/round-undefined";
  const signatures_outdated     : string = "Bridge-core/signatures-outdated";
  const not_enough_signatures   : string = "Bridge-core/not-enough-signatures";
  const invalid_payload         : string = "Bridge-core/invalid-payload";
  }