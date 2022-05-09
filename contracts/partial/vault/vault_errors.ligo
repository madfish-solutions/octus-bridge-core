module Errors is {
  (* Permission errors *)
  const not_owner                 : string = "Vault/not-owner";
  const not_pending_owner         : string = "Vault/not-pending-owner";
  const not_guardian              : string = "Vault/not-guardian";
  const not_fish                  : string = "Vault/not-fish";
  const asset_undefined           : string = "Vault/asset-undefined";

  }