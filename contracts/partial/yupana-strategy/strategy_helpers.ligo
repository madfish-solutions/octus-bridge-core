[@inline] function get_balance_op(
  const token_id          : token_id_t;
  const protocol          : address)
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
      (Tezos.get_entrypoint_opt("%getBalance", protocol) : option(contract(balance_params_t))),
      Errors.get_balance_etp_404)
    )

[@inline] function get_reedem_op(
  const reedem_amount     : nat;
  const min_received      : nat;
  const asset_id          : token_id_t;
  const protocol          : address)
                          : operation is
  Tezos.transaction((
    record[
      tokenId     = asset_id;
      amount      = reedem_amount;
      minReceived = min_received;
    ] : call_y_t),
    0mutez,
    unwrap(
      (Tezos.get_entrypoint_opt("%redeem", protocol) : option(contract(call_y_t))),
      Errors.redeem_etp_404
      )
  );

[@inline] function get_get_price_op(
  const token_id        : nat;
  const price_feed      : address)
                        : operation is
  Tezos.transaction(
    token_id,
    0mutez,
    unwrap(
      (Tezos.get_entrypoint_opt("%getPrice", price_feed) : option(contract(nat))),
      Errors.get_price_etp_404
      )
  );

[@inline] function get_update_interest_op(
  const token_id        : nat;
  const protocol        : address)
                        : operation is
  Tezos.transaction(
    token_id,
    0mutez,
    unwrap(
      (Tezos.get_entrypoint_opt("%updateInterest", protocol) : option(contract(nat))),
      Errors.update_interest_etp_404
      )
  );

function wrap_transfer(
  const sender_          : address;
  const recipient         : address;
  const amount_          : nat;
  const token            : asset_standard_t)
                         : operation is
    case token of [
    | Fa12(address_) -> Tezos.transaction(
        (sender_,
        (recipient, amount_)),
        0mutez,
        unwrap(
          (Tezos.get_entrypoint_opt("%transfer", address_) : option(contract(fa12_transfer_t))),
          Errors.transfer_etp_404))
    | Fa2(token_) -> transfer_fa2(
        sender_,
        recipient,
        amount_,
        token_.id,
        token_.address)
    | Tez -> failwith(Errors.wrong_asset)
    | Wrapped(token_) -> transfer_fa2(
        sender_,
        recipient,
        amount_,
        token_.id,
        token_.address)
    ]

function convert_amount(
  const amount_     : nat;
  const asset_id    : nat;
  const protocol    : address;
  const to_shares   : bool;
  const precision   : bool)
                    : nat is
  unwrap(
    (Tezos.call_view(
      "convert",
      record[
        toShares = to_shares;
        tokenId = asset_id;
        amount = amount_;
        precision = precision],
      protocol) : option(nat)),
    Errors.protocol_view_404
  )

function get_shares_balance(
  const asset_id    : nat;
  const protocol    : address;
  const precision   : bool)
                    : nat is
  block {
    const response = unwrap(
      List.head_opt(
        unwrap((Tezos.call_view(
            "balanceOf",
            record[
              requests = list[
                  record[
                    owner = Tezos.self_address;
                    token_id = asset_id;
                  ]
                ];
              precision = precision

            ],
            protocol) : option(list(balance_of_response_t))),
            Errors.protocol_view_404
      )), Errors.protocol_view_404)
  } with response.balance