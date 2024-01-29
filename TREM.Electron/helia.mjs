/* eslint-disable no-console */
import { createHelia, libp2pDefaults } from "helia";
import { unixfs } from "@helia/unixfs";
import { CID } from "multiformats/cid";
import { base64 } from "multiformats/bases/base64";

export async function create_Helia () {
  // return await createHelia();

  const libp2pOptions = libp2pDefaults();
  console.log(libp2pOptions.peerId);

  const helia = await createHelia({
    libp2p: libp2pOptions
  });
  return helia;
}

export function helia_unixfs (heliaInstance) {
  return unixfs(heliaInstance);
}

export function multiformats_CID () {
  return CID;
}

export function multiformats_base64 () {
  return base64;
}