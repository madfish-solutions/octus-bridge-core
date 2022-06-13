
type storage_t          is nat

type return_t           is list (operation) * storage_t


type parameter_t        is
| GetPrice                of nat
| Default

function getPrice(
  const _unit           : nat;
  const s               : storage_t)
                        : return_t is
  ((nil : list(operation)), s)

function default(
  const _unit           : unit;
  const s               : storage_t)
                        : return_t is
  ((nil : list(operation)), s)

function main(
  const action          : parameter_t;
  const s               : storage_t)
                        : return_t is
  case action of [
  | GetPrice(params)      ->  getPrice(s, params)
  | Default               ->  default(unit, s)

  ]
