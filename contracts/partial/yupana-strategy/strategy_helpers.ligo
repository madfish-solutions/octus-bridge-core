[@inline] function get_balance_op(
  const token_id          : token_id_t;
  const yupana_addr       : address)
                          : operation is
  Tezos.transaction(
    record [
      requests = list[
        record[
          owner = Tezos.self_address;
          token_id = token_id;
        ]
      ];
      callback = unwrap(
          (Tezos.get_entrypoint_opt("%callback_balance", Tezos.self_address) : option(contract(list (balance_of_response_t)))),
          Errors.callback_balance_404);
    ],
    0mutez,
    unwrap(
      (Tezos.get_entrypoint_opt("%getBalance", yupana_addr) : option(contract(balance_params_t))),
      Errors.get_balance_etp_404)
    )
