module Errors is {
  (* Permission errors *)
  const not_owner                 : string = "Vault/not-owner";
  const not_pending_owner         : string = "Vault/not-pending-owner";
  const not_guardian              : string = "Vault/not-guardian";
  const not_fish                  : string = "Vault/not-fish";
  const not_owner_or_guardian     : string = "Vault/not-owner-or-guardian";
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
  const failed_create_asset       : string = "Vault/failed-create-asset"
  }