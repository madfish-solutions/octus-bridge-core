import json

def parse_lambdas(path):
    lambdas = {}
    entries = json.load(open(path))
    for i in range(len(entries)):
        entry = entries[i]
        lambdas[i] = entry["args"][1]["bytes"]

    return lambdas

vault_lambdas = parse_lambdas("./builds/lambdas/vault_lambdas.json")