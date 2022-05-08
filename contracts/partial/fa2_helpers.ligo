(* Create tranfer tx param *)
function wrap_fa2_transfer_trx(
  const from_         : address;
  const to_           : address;
  const amount_       : nat;
  const token_id      : nat)
                      : fa2_transfer_t is
  block {
    const transfer_destination : transfer_destination_t = record [
      to_               = to_;
      token_id          = token_id;
      amount            = amount_;
    ];
    const transfer_param : fa2_transfer_param_t = record [
      from_             = from_;
      txs               = list[transfer_destination];
    ];
  } with list[transfer_param]

(* Helper function to transfer fa2 tokens *)
function transfer_fa2(
  const sender_         : address;
  const receiver        : address;
  const amount_         : nat;
  const token_id        : token_id_t;
  const contract_address : address) : operation is
  Tezos.transaction(
    wrap_fa2_transfer_trx(
      sender_,
      receiver,
      amount_,
      token_id),
    0mutez,
    unwrap(
      (Tezos.get_entrypoint_opt("%transfer", contract_address) : option(contract(fa2_transfer_t))),
      Errors.transfer_not_found)
  );

