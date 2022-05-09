const { Parser, packDataBytes } = require("@taquito/michel-codec");

function paramToBytes({ endTime, relays }) {
  const parser = new Parser();
  const type = `
    (pair
      (timestamp %end_time)
      (set %relays key))`;
  const data = `
    (Pair
      ${endTime}
      {${relays}})`;

  const dataJSON = parser.parseMichelineExpression(data);
  const typeJSON = parser.parseMichelineExpression(type);

  const packed = packDataBytes(dataJSON, typeJSON);

  return packed.bytes;
}

module.exports = paramToBytes;
