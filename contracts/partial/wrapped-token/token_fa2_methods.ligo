(* Perform transfers from one owner *)
function iterate_transfer (
  var s                 : storage_t;
  const trx_params      : transfer_param_t)
                        : storage_t is
  block {

    (* Perform single transfer *)
    function make_transfer(
      var s             : storage_t;
      var transfer      : transfer_destination_t)
                        : storage_t is
      block {
        const sender_key : ledger_key_t = (trx_params.from_, transfer.token_id);
        const sender_allowances = unwrap_or(s.allowances[sender_key], Constants.empty_allowances);
        (* Check permissions *)
        require(trx_params.from_ = Tezos.sender
          or Set.mem(Tezos.sender, sender_allowances), Errors.fa2_not_operator);

        const sender_balance = unwrap(s.ledger[sender_key], Errors.fa2_low_balance);

        (* Update sender account *)
        s.ledger[sender_key] := get_nat_or_fail(sender_balance - transfer.amount, Errors.fa2_low_balance);

        (* Create or get destination account *)
        const destination_key = (transfer.to_, transfer.token_id);
        const destination_balance = unwrap_or(s.ledger[destination_key], 0n);

        (* Update destination account *)
        s.ledger[destination_key] := destination_balance + transfer.amount;

    } with s;
} with List.fold (make_transfer, trx_params.txs, s)

(* Perform single operator update *)
function iterate_update_operators(
  var s                 : storage_t;
  const params          : update_operator_param_t)
                        : storage_t is
  block {
    const (param, should_add) = case params of [
    | Add_operator(param)    -> (param, True)
    | Remove_operator(param) -> (param, False)
    ];

    require(param.token_id < s.token_count, Errors.fa2_token_undefined);
    require(Tezos.sender = param.owner, Errors.fa2_not_owner);

    const account_key = (param.owner, param.token_id);
    const account_allowances = unwrap_or(s.allowances[account_key], Constants.empty_allowances);
    s.allowances[account_key] := Set.update(param.operator, should_add, account_allowances);

  } with s

(* Perform balance lookup *)
function get_balance_of(
  const s               : storage_t;
  const balance_params  : balance_params_t)
                        : list(operation) is
  block {
    (* Perform single balance lookup *)
    function look_up_balance(
      const l           : list(balance_of_response_t);
      const request     : balance_of_request_t)
                        : list(balance_of_response_t) is
      block {
        require(request.token_id < s.token_count, Errors.fa2_token_undefined);
        (* Retrieve the asked account from the storage *)
        const account_key = (request.owner, request.token_id);
        const balance_ = unwrap_or(s.ledger[account_key], 0n);

        (* Form the response *)
        var response : balance_of_response_t := record [
            request = request;
            balance = balance_;
          ];
      } with response # l;

    (* Collect balances info *)
    const accumulated_response : list(balance_of_response_t) =
      List.fold(
        look_up_balance,
        balance_params.requests,
        (nil: list(balance_of_response_t)));
  } with list [Tezos.transaction(
    accumulated_response,
    0tz,
    balance_params.callback
  )]

function update_operators(
  const s               : storage_t;
  const params          : update_operator_params_t)
                        : storage_t is
  List.fold(iterate_update_operators, params, s)

function transfer(
  const s               : storage_t;
  const params          : transfer_params_t)
                        : storage_t is
  List.fold(iterate_transfer, params, s)
