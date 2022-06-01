module Errors is {
  (* Permission errors *)
  const not_owner                 : string = "Vault/not-owner";
  const not_pending_owner         : string = "Vault/not-pending-owner";
  const not_guardian              : string = "Vault/not-guardian";
  const not_fish                  : string = "Vault/not-fish";
  const not_owner_or_guardian     : string = "Vault/not-owner-or-guardian";
  const not_fish_or_management    : string = "Vault/not-fish-or-management";
  const asset_undefined           : string = "Vault/asset-undefined";
  const metadata_undefined        : string = "Vault/metadata-undefined";
  const create_token_etp_404      : string = "Vault/create-token-etp-404";
  const mint_etp_404              : string = "Vault/mint-etp-404";
  const burn_etp_404              : string = "Vault/burn-etp-404";
  const transfer_etp_404          : string = "Vault/transfer-etp-404";
  const implict_account_404       : string = "Vault/not-implict-account";
  const asset_paused              : string = "Vault/asset-is-paused";
  const asset_banned              : string = "Vault/asset-is-banned";
  const vault_paused              : string = "Vault/vault-is-paused";
  const zero_transfer             : string = "Vault/zero-transfer";
  const not_nat                   : string = "Vault/not-nat";
  const amounts_mismatch          : string = "Vault/amounts-mismatch";
  const failed_create_asset       : string = "Vault/failed-create-asset";
  const validate_message_view_404 : string = "Vault/validate-message-view-404";
  const round_greater_last_round  : string = "Vault/round-greater-than-last-round";
  const round_less_initial_round  : string = "Vault/round-less-than-initial-round";
  const round_outdated            : string = "Vault/round-outdated";
  const not_enough_signatures     : string = "Vault/not-enough-signatures";
  const invalid_payload           : string = "Vault/invalid-payload";
  const payload_already_seen      : string = "Vault/payload-already-seen";
  const wrong_event_configuration : string = "Vault/wrong-event-configuration";
  const wrong_round               : string = "Vault/wrong-round";
  const invalid_new_round         : string = "Vault/invalid-new-round";
  const bridge_paused             : string = "Vault/bridge-paused";
  const validate_message_404      : string = "Vault/view-validate-methods-not-found";
  const invalid_withdrawal_params : string = "Vault/invalid-withdawal-params";
  const zero_fee_balance          : string = "Vault/zero-fee-balance";
  }