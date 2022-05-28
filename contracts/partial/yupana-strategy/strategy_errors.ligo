module Errors is {
  (* Permission errors *)
  const not_owner                 : string = "Yup-strategy/not-owner";
  const not_pending_owner         : string = "Yup-strategy/not-pending-owner";
  const not_vault                 : string = "Yup-strategy/not-vault";
  const sender_not_protocol       : string = "Yup-strategy/sender-not-protocol";
  const source_not_vault          : string = "Yup-strategy/source-not-vault";
  const mint_etp_404              : string = "Yup-strategy/mint-etp-404";
  const callback_balance_404      : string = "Yup-strategy/callback-balance-404";
  const get_balance_etp_404       : string = "Yup-strategy/get-balance-etp-404";
  const transfer_etp_404          : string = "Yup-strategy/transfer-etp-404";

  }