const { Parser, packDataBytes } = require("@taquito/michel-codec");

function paramToBytes({
  eventTrxLt,
  eventTimestamp,
  eventData,
  confWid,
  confAddr,
  eventContractWid,
  eventContractAddr,
  proxy,
  round,
}) {
  const parser = new Parser();
  const type = `
    (pair
      (nat %event_transaction_lt)
      (nat %event_timestamp)
      (bytes %event_data)
      (int %configuration_wid)
      (bytes %configuration_address)
      (int %event_contract_wid)
      (bytes %event_contract_address)
      (bytes %proxy)
      (nat %round))`;
  let data = `
    (Pair
      ${eventTrxLt}
      ${eventTimestamp}
      0x${eventData}
      ${confWid}
      0x${confAddr}
      ${eventContractWid}
      0x${eventContractAddr}
      0x${proxy}
      ${round})`;

  const dataJSON = parser.parseMichelineExpression(data);
  const typeJSON = parser.parseMichelineExpression(type);

  const packed = packDataBytes(dataJSON, typeJSON);

  return packed.bytes;
}

module.exports = paramToBytes;
