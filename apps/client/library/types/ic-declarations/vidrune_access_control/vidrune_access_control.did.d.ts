import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Principal = Principal;
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = { 'ok' : bigint } |
  { 'err' : string };
export type Result_2 = { 'ok' : boolean } |
  { 'err' : string };
export interface VideoMetadata {
  'id' : string,
  'title' : string,
  'audioTranscript' : [] | [string],
  'description' : string,
  'uploader' : Principal,
  'captions' : [] | [string],
  'uploadTime' : bigint,
  'fileKey' : string,
}
export interface _SERVICE {
  'canUpload' : ActorMethod<[], Result_2>,
  'getStats' : ActorMethod<
    [],
    {
      'totalVideos' : bigint,
      'uploadCost' : bigint,
      'testnetGiftAmount' : bigint,
    }
  >,
  'getTestnetTokens' : ActorMethod<[], Result>,
  'getTokenBalance' : ActorMethod<[], Result_1>,
  'getVITokenCanisterId' : ActorMethod<[], [] | [Principal]>,
  'getVideoMetadata' : ActorMethod<[string], [] | [VideoMetadata]>,
  'getVideosByUploader' : ActorMethod<
    [Principal, bigint],
    Array<VideoMetadata>
  >,
  'listVideos' : ActorMethod<[bigint, bigint], Array<VideoMetadata>>,
  'setVITokenCanister' : ActorMethod<[Principal], Result>,
  'storeVideoMetadata' : ActorMethod<
    [string, string, string, [] | [string], [] | [string]],
    Result
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
