module Errors is {
  (* Permission errors *)
  const not_owner                 : string = "Bridge-core/not-owner";
  const not_pending_owner         : string = "Bridge-core/not-pending-owner";
  const not_submitter             : string = "Bridge-core/not-round-submitter";
  const bridge_paused             : string = "Bridge-core/bridge-paused";
  const round_greater_last_round  : string = "Bridge-core/round-greater-than-last-round";
  const round_less_initial_round  : string = "Bridge-core/round-less-than-initial-round";
  const round_outdated            : string = "Bridge-core/round-outdated";
  const not_enough_signatures     : string = "Bridge-core/not-enough-signatures";
  const bridge_paused             : string = "Bridge-core/bridge-paused"
  const invalid_payload           : string = "Bridge-core/invalid-payload";
  const invalid_new_round         : string = "Bridge-core/invalid-new-round";
  const validate_message_404      : string = "Bridge-core/view-validate-methods-not-found"
  }