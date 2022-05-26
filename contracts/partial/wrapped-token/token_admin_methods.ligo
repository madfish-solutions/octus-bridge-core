function set_vault(
  const new_address     : address;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
  } with (Constants.no_operations, s with record[
      vault = new_address
  ])

function update_token_metadata(
  const params          : token_metadata_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    require(params.token_id < s.token_count, Errors.token_undefined);

    s.token_metadata[params.token_id] := params;
  } with (Constants.no_operations, s)