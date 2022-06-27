function set_owner(
  const new_owner       : address;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations, s with record[owner = new_owner])

function update_operator(
  const add_operator    : bool;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);

    const token : token_t = case s.deposit_asset of [
      | Fa2(token) -> token
      | Wrapped(token) -> token
      | _ -> failwith(Errors.wrong_asset)
      ];

    const param = if add_operator
      then list[
          Add_operator(
            record[
              owner    = Tezos.self_address;
              operator = s.protocol;
              token_id = token.id;
            ])
        ]
      else list[
          Remove_operator(
            record[
              owner    = Tezos.self_address;
              operator = s.protocol;
              token_id = token.id;
            ])
        ];
  } with (
      list[
        Tezos.transaction(
          param,
          0mutez,
          unwrap(
            (Tezos.get_entrypoint_opt("%update_operators", token.address) : option(contract(approve_fa2_token_t))),
            Errors.approve_etp_404)
          )],
      s)