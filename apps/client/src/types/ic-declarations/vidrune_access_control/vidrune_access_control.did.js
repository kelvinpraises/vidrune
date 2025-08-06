export const idlFactory = ({ IDL }) => {
  const Result_2 = IDL.Variant({ 'ok' : IDL.Bool, 'err' : IDL.Text });
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const Principal = IDL.Principal;
  const VideoMetadata = IDL.Record({
    'id' : IDL.Text,
    'title' : IDL.Text,
    'audioTranscript' : IDL.Opt(IDL.Text),
    'description' : IDL.Text,
    'uploader' : Principal,
    'captions' : IDL.Opt(IDL.Text),
    'uploadTime' : IDL.Int,
    'fileKey' : IDL.Text,
  });
  return IDL.Service({
    'canUpload' : IDL.Func([], [Result_2], []),
    'getStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'totalVideos' : IDL.Nat,
            'uploadCost' : IDL.Nat,
            'testnetGiftAmount' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getTestnetTokens' : IDL.Func([], [Result], []),
    'getTokenBalance' : IDL.Func([], [Result_1], []),
    'getVITokenCanisterId' : IDL.Func([], [IDL.Opt(Principal)], ['query']),
    'getVideoMetadata' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(VideoMetadata)],
        ['query'],
      ),
    'getVideosByUploader' : IDL.Func(
        [Principal, IDL.Nat],
        [IDL.Vec(VideoMetadata)],
        ['query'],
      ),
    'listVideos' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(VideoMetadata)],
        ['query'],
      ),
    'setVITokenCanister' : IDL.Func([Principal], [Result], []),
    'storeVideoMetadata' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
        [Result],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
