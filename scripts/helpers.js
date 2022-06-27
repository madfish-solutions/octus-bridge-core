const { alice } = require("../scripts/sandbox/accounts");
require("dotenv").config();

const { execSync } = require("child_process");
const fs = require("fs");
const { TezosToolkit } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");
const { confirmOperation } = require("./confirmation");
const env = require("../env");

const getLigo = isDockerizedLigo => {
  let path = "ligo";

  if (isDockerizedLigo) {
    path = `docker run -v $PWD:$PWD --rm -i ligolang/ligo:${env.ligoVersion}`;

    try {
      execSync(`${path}  --help`);
    } catch (err) {
      path = "ligo";

      execSync(`${path}  --help`);
    }
  } else {
    try {
      execSync(`${path}  --help`);
    } catch (err) {
      path = `docker run -v $PWD:$PWD --rm -i ligolang/ligo:${env.ligoVersion}`;

      execSync(`${path}  --help`);
    }
  }

  return path;
};

const getContractsList = () => {
  return fs
    .readdirSync(env.contractsDir)
    .filter(file => file.endsWith(".ligo"))
    .map(file => file.slice(0, file.length - 5));
};

const getTestContractsList = () => {
  return fs
    .readdirSync(env.contractsTestDir)
    .filter(file => file.endsWith(".ligo"))
    .map(file => file.slice(0, file.length - 5));
};

const getMigrationsList = () => {
  return fs
    .readdirSync(env.migrationsDir)
    .filter(file => file.endsWith(".js"))
    .map(file => file.slice(0, file.length - 3));
};

const compile = async (contract, format) => {
  const ligo = getLigo(true);
  format = format || "json";
  const contracts = !contract ? getContractsList() : [contract];
  contracts.forEach(contract => {
    let michelson;
    try {
      michelson = execSync(
        `${ligo} compile contract $PWD/${env.contractsDir}/${contract}.ligo -s pascaligo --michelson-format ${format} --protocol ithaca`,
        { maxBuffer: 1024 * 4000 },
      ).toString();
    } catch (e) {
      console.log(e);
    }

    if (format == "json") {
      const artifacts = JSON.stringify(
        {
          michelson: JSON.parse(michelson),
          networks: {},
          compiler: "ligo:" + env.ligoVersion,
        },
        null,
        2,
      );
      if (!fs.existsSync(env.buildsDir)) {
        fs.mkdirSync(env.buildsDir);
      }
      fs.writeFileSync(`${env.buildsDir}/${contract}.json`, artifacts);
    } else {
      fs.writeFileSync(`${env.contractsDir}/${contract}.tz`, michelson);
    }
  });
};
const compileTest = async (contract, format) => {
  format = format || "json";
  const ligo = getLigo(true);
  const contracts = !contract ? getTestContractsList() : [contract];
  contracts.forEach(contract => {
    let michelson;
    try {
      michelson = execSync(
        `${ligo} compile contract $PWD/${env.contractsTestDir}/${contract}.ligo -s pascaligo --michelson-format ${format} --protocol ithaca`,
        { maxBuffer: 1024 * 2000 },
      ).toString();
    } catch (e) {
      console.log(e);
    }

    if (format == "json") {
      const artifacts = JSON.stringify(
        {
          michelson: JSON.parse(michelson),
          networks: {},
          compiler: "ligo:" + env.ligoVersion,
        },
        null,
        2,
      );
      if (!fs.existsSync(env.buildsDir)) {
        fs.mkdirSync(env.buildsDir);
      }
      fs.writeFileSync(`${env.buildsDir}/${contract}.json`, artifacts);
    } else {
      fs.writeFileSync(`${env.contractsDir}/${contract}.tz`, michelson);
    }
  });
};

const compileLambdas = async (
  json,
  contract,
  ligoVersion = env.ligoVersion,
) => {
  const ligo = getLigo(true, ligoVersion);
  const pwd = execSync("echo $PWD").toString();
  const lambdas = JSON.parse(
    fs.readFileSync(`${pwd.slice(0, pwd.length - 1)}/${json}`),
  );
  let res = [];

  try {
    let list = "list [";

    for (const lambda of lambdas) {
      list += `Setup_func(record [index=${lambda.index}n; func=Bytes.pack(${lambda.name})]);`;
    }
    list += "]";

    const michelson = execSync(
      `${ligo} compile expression pascaligo '${list}' --michelson-format json --init-file $PWD/${contract} --protocol ithaca`,
      { maxBuffer: 2024 * 4000 },
    ).toString();

    const michelsonsJson = JSON.parse(michelson);
    for (const func of michelsonsJson) {
      res.push(func.args[0]);
    }

    if (!fs.existsSync(`${env.buildsDir}/lambdas`)) {
      fs.mkdirSync(`${env.buildsDir}/lambdas`);
    }

    fs.writeFileSync(
      `${env.buildsDir}/lambdas/vault_lambdas.json`,
      JSON.stringify(res),
    );
  } catch (e) {
    console.error(e);
  }
};

const migrate = async (tezos, contract, storage) => {
  try {
    const artifacts = JSON.parse(
      fs.readFileSync(`${env.buildsDir}/${contract}.json`),
    );
    const operation = await tezos.contract
      .originate({
        code: artifacts.michelson,
        storage: storage,
      })
      .catch(e => {
        console.error(JSON.stringify(e));

        return { contractAddress: null };
      });

    await confirmOperation(tezos, operation.hash);

    artifacts.networks[env.network] = { [contract]: operation.contractAddress };

    if (!fs.existsSync(env.buildsDir)) {
      fs.mkdirSync(env.buildsDir);
    }

    fs.writeFileSync(
      `${env.buildsDir}/${contract}.json`,
      JSON.stringify(artifacts, null, 2),
    );

    return operation.contractAddress;
  } catch (e) {
    console.error(e);
  }
};

const getDeployedAddress = contract => {
  try {
    const artifacts = JSON.parse(
      fs.readFileSync(`${env.buildsDir}/${contract}.json`),
    );

    return artifacts.networks[env.network][contract];
  } catch (e) {
    console.error(e);
  }
};

const runMigrations = async options => {
  try {
    const migrations = getMigrationsList();

    const network = env.network;

    const networkConfig = env.networks[network];

    const tezos = new TezosToolkit(networkConfig.rpc);

    tezos.setProvider({
      config: {
        confirmationPollingTimeoutSecond: env.confirmationPollingTimeoutSecond,
      },
      signer: await InMemorySigner.fromSecretKey(networkConfig.secretKey),
    });

    for (const migration of migrations) {
      const execMigration = require(`../${env.migrationsDir}/${migration}.js`);

      await execMigration(tezos);
    }
  } catch (e) {
    console.error(e);
  }
};

module.exports = {
  getLigo,
  getContractsList,
  getMigrationsList,
  getDeployedAddress,
  compile,
  compileTest,
  migrate,
  runMigrations,
  compileLambdas,
  env,
};
