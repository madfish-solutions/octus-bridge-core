module Errors is {
  (* Permission errors *)
  const not_owner                 : string = "Yup-strategy/not-owner";
  const not_pending_owner         : string = "Yup-strategy/not-pending-owner";
  const not_vault                 : string = "Yup-strategy/not-vault";
  const sender_not_protocol       : string = "Yup-strategy/sender-not-protocol";
  const source_not_vault          : string = "Yup-strategy/source-not-vault";
  const zero_profit               : string = "Yup-strategy/zero-profit";
  const low_balance               : string = "Yup-strategy/low-balance";
  const zero_transfer             : string = "Yup-strategy/zero-transfer";
  const mint_etp_404              : string = "Yup-strategy/mint-etp-404";
  const callback_balance_404      : string = "Yup-strategy/callback-balance-404";
  const get_balance_etp_404       : string = "Yup-strategy/get-balance-etp-404";
  const transfer_etp_404          : string = "Yup-strategy/transfer-etp-404";
  const approve_etp_404           : string = "Yup-strategy/approve-etp-404";
  const redeem_etp_404            : string = "Yup-strategy/redeem-etp-404";
  const wrong_asset               : string = "Yup-strategy/wrong-asset-404";
  const protocol_view_404         : string = "Yup-strategy/protocol-view-404";
  const get_price_etp_404         : string = "Yup-strategy/get-price-etp-404";
  const update_interest_etp_404   : string = "Yup-strategy/update-interest-etp-404";
  const not_nat                   : string = "Yup-strategy/not-nat";
  }