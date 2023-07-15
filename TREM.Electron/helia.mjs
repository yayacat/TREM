/* eslint-disable no-console */

import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { CID } from 'multiformats/cid';
import { base64 } from "multiformats/bases/base64"

export async function create_Helia () {
  return await createHelia();
}

export function helia_unixfs () {
  return unixfs();
}

export function multiformats_CID () {
  return CID;
}

export function multiformats_base64 () {
  return base64;
}