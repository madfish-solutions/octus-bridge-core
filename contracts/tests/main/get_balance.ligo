(* Helper contract for tests *)
type storage_type       is record[
  response                : nat;
  bridge_address          : address;
]


type return_type        is (list(operation) * storage_type)


type balance_of_request_type is
  [@layout:comb]
  record [
    owner       : address;
    token_id     : nat;
  ]

type balance_of_response_type is
  [@layout:comb]
  record [
    request     : balance_of_request_type;
    balance     : nat;
  ]

type balance_params_type is
  [@layout:comb]
  record [
    requests    : list (balance_of_request_type);
    callback    : contract (list (balance_of_response_type));
  ]

(* Helper to get the entrypoint of current contract *)
function get_callback(
  const addr            : address)
                        : contract(list(balance_of_response_type)) is
  case (Tezos.get_entrypoint_opt(
    "%receive_balance",
    addr)      : option(contract(list(balance_of_response_type)))) of [
    Some(contr) -> contr
  | None -> (failwith("Test/not-callback") : contract(list(balance_of_response_type)) )
  ];

(* Helper to get the entrypoint of contract *)
function get_balance_entrypoint(
  const token_address   : address)
                        : contract(balance_params_type) is
  case (Tezos.get_entrypoint_opt(
    "%balance_of",
    token_address) : option(contract(balance_params_type))) of [
    Some(contr) -> contr
    | None -> (failwith("Test/not-pool") : contract(balance_params_type) )
  ];

function balance_of(
  const owner           : address;
  const token_id        : nat;
  const s               : storage_type)
                        : return_type is
  block {
    const op : operation = Tezos.transaction(
      record [
        requests    = list[record[
                        owner   = owner;
                        token_id = token_id]];
        callback    = get_callback(Tezos.self_address);
      ],
      0mutez,
      get_balance_entrypoint(s.bridge_address)
    );
  } with (list[op], s)


function receive_balance(
  const l               : list(balance_of_response_type);
  var s                 : storage_type)
                        : storage_type is
  block {
    const response = case List.head_opt(l) of [
      Some(r) -> r
    | None -> (failwith("Test/bad-response") : balance_of_response_type)
    ];
    s.response := response.balance;
  } with s

type param_type         is
  Balance_of              of (address * nat)
| Receive_balance         of list(balance_of_response_type)


function main(
  const action          : param_type;
  const s               : storage_type)
                        : return_type is
  case action of [
    Balance_of(params)        -> balance_of(params.0, params.1, s)
  | Receive_balance(params)   -> ((nil : list(operation)), receive_balance(params, s))

  ]
