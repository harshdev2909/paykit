import { Horizon } from "@stellar/stellar-sdk";
import { getHorizonUrl } from "../services/nodeRouter";

let serverInstance: Horizon.Server | null = null;

export function getStellarServer(): Horizon.Server {
  if (!serverInstance) {
    serverInstance = new Horizon.Server(getHorizonUrl());
  }
  return serverInstance;
}

export function resetStellarServer(): void {
  serverInstance = null;
}
