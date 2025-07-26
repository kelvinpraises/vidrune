import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Debug "mo:base/Debug";
import Iter "mo:base/Iter";
import HashMap "mo:base/HashMap";

actor VidruneAccessControl {

  // Types
  type Principal = Principal.Principal;
  type VideoMetadata = {
    id: Text;
    title: Text;
    description: Text;
    uploader: Principal;
    uploadTime: Int;
    fileKey: Text; // Key/path in assets canister
    captions: ?Text; // JSON string of captions
    audioTranscript: ?Text; // JSON string of audio transcript
  };

  // ICRC-1 Types for inter-canister calls
  type Account = {
    owner: Principal;
    subaccount: ?Blob;
  };

  type TransferArgs = {
    from_subaccount: ?Blob;
    to: Account;
    amount: Nat;
    fee: ?Nat;
    memo: ?Blob;
    created_at_time: ?Nat64;
  };

  type TransferFromArgs = {
    spender_subaccount: ?Blob;
    from: Account;
    to: Account;
    amount: Nat;
    fee: ?Nat;
    memo: ?Blob;
    created_at_time: ?Nat64;
  };

  type TransferResult = {
    #Ok: Nat;
    #Err: {
      #BadFee: { expected_fee: Nat };
      #BadBurn: { min_burn_amount: Nat };
      #InsufficientFunds: { balance: Nat };
      #TooOld;
      #CreatedInFuture: { ledger_time: Nat64 };
      #Duplicate: { duplicate_of: Nat };
      #TemporarilyUnavailable;
      #GenericError: { error_code: Nat; message: Text };
    };
  };

  // VI Token canister interface
  type VITokenCanister = actor {
    icrc1_balance_of: (Account) -> async Nat;
    icrc2_transfer_from: (TransferFromArgs) -> async TransferResult;
    icrc1_transfer: (TransferArgs) -> async TransferResult;
  };

  // Storage
  private stable var videoMetadataEntries : [(Text, VideoMetadata)] = [];
  private var videoMetadata = HashMap.fromIter<Text, VideoMetadata>(
    videoMetadataEntries.vals(),
    10,
    Text.equal,
    Text.hash
  );

  private stable var nextVideoId : Nat = 1;
  private stable var viTokenCanisterId : ?Principal = null;

  // Constants (in e8s format, 8 decimals like VI token)
  private let UPLOAD_COST : Nat = 100_000_000; // 1.0 VI token
  private let TESTNET_GIFT_AMOUNT : Nat = 10_000_000_000; // 100.0 VI tokens

  // Initialize with VI token canister ID
  public func setVITokenCanister(canisterId: Principal): async Result.Result<Text, Text> {
    viTokenCanisterId := ?canisterId;
    #ok("VI Token canister set successfully")
  };

  // Get the VI token canister
  private func getVITokenCanister(): async Result.Result<VITokenCanister, Text> {
    switch (viTokenCanisterId) {
      case (?id) {
        let canister: VITokenCanister = actor(Principal.toText(id));
        #ok(canister)
      };
      case null {
        #err("VI Token canister not configured")
      };
    }
  };

  // System functions for upgrade persistence
  system func preupgrade() {
    videoMetadataEntries := Iter.toArray(videoMetadata.entries());
  };

  system func postupgrade() {
    videoMetadataEntries := [];
  };

  // Public functions

  // Check user's VI token balance
  public shared(msg) func getTokenBalance(): async Result.Result<Nat, Text> {
    let caller = msg.caller;
    
    switch (await getVITokenCanister()) {
      case (#ok(tokenCanister)) {
        let account: Account = {
          owner = caller;
          subaccount = null;
        };
        let balance = await tokenCanister.icrc1_balance_of(account);
        #ok(balance)
      };
      case (#err(error)) {
        #err(error)
      };
    }
  };

  // Check if user can upload (has sufficient VI tokens)
  public shared(msg) func canUpload(): async Result.Result<Bool, Text> {
    let caller = msg.caller;
    
    switch (await getTokenBalance()) {
      case (#ok(balance)) {
        #ok(balance >= UPLOAD_COST)
      };
      case (#err(error)) {
        #err(error)
      };
    }
  };

  // Gift testnet tokens (for development - transfers from this canister's balance)
  public shared(msg) func getTestnetTokens(): async Result.Result<Text, Text> {
    let caller = msg.caller;
    
    switch (await getVITokenCanister()) {
      case (#ok(tokenCanister)) {
        // Check if user already has sufficient tokens
        let userAccount: Account = {
          owner = caller;
          subaccount = null;
        };
        
        let currentBalance = await tokenCanister.icrc1_balance_of(userAccount);
        if (currentBalance >= TESTNET_GIFT_AMOUNT) {
          return #err("You already have sufficient testnet tokens");
        };

        // Transfer tokens from this canister to the user
        let transferArgs: TransferArgs = {
          from_subaccount = null;
          to = userAccount;
          amount = TESTNET_GIFT_AMOUNT;
          fee = null; // Use default fee
          memo = null;
          created_at_time = null;
        };

        switch (await tokenCanister.icrc1_transfer(transferArgs)) {
          case (#Ok(blockIndex)) {
            #ok("Successfully received " # Nat.toText(TESTNET_GIFT_AMOUNT / 100_000_000) # " VI testnet tokens")
          };
          case (#Err(error)) {
            switch (error) {
              case (#InsufficientFunds { balance }) {
                #err("Testnet faucet has insufficient funds. Current balance: " # Nat.toText(balance))
              };
              case (#BadFee { expected_fee }) {
                #err("Bad fee. Expected: " # Nat.toText(expected_fee))
              };
              case _ {
                #err("Token transfer failed")
              };
            }
          };
        }
      };
      case (#err(error)) {
        #err(error)
      };
    }
  };

  // Store video metadata (requires VI tokens)
  public shared(msg) func storeVideoMetadata(
    title: Text,
    description: Text,
    fileKey: Text,
    captions: ?Text,
    audioTranscript: ?Text
  ): async Result.Result<Text, Text> {
    let caller = msg.caller;
    
    // Check if user has sufficient tokens
    switch (await canUpload()) {
      case (#ok(canUploadResult)) {
        if (not canUploadResult) {
          return #err("Insufficient VI tokens. You need " # Nat.toText(UPLOAD_COST / 100_000_000) # " VI tokens to upload.");
        };
      };
      case (#err(error)) {
        return #err("Failed to check token balance: " # error);
      };
    };

    // Transfer tokens from user to this canister (burn mechanism)
    switch (await getVITokenCanister()) {
      case (#ok(tokenCanister)) {
        let userAccount: Account = {
          owner = caller;
          subaccount = null;
        };
        
        let thisCanisterAccount: Account = {
          owner = Principal.fromActor(VidruneAccessControl);
          subaccount = null;
        };

        let transferFromArgs: TransferFromArgs = {
          spender_subaccount = null;
          from = userAccount;
          to = thisCanisterAccount;
          amount = UPLOAD_COST;
          fee = null;
          memo = null;
          created_at_time = null;
        };

        switch (await tokenCanister.icrc2_transfer_from(transferFromArgs)) {
          case (#Ok(blockIndex)) {
            // Token transfer successful, proceed with metadata storage
          };
          case (#Err(error)) {
            return #err("Token transfer failed. Make sure you have approved this canister to spend your VI tokens.");
          };
        }
      };
      case (#err(error)) {
        return #err(error);
      };
    };

    // Generate video ID
    let videoId = "video_" # Nat.toText(nextVideoId);
    nextVideoId += 1;

    // Create metadata
    let metadata: VideoMetadata = {
      id = videoId;
      title = title;
      description = description;
      uploader = caller;
      uploadTime = Time.now();
      fileKey = fileKey;
      captions = captions;
      audioTranscript = audioTranscript;
    };

    // Store metadata
    videoMetadata.put(videoId, metadata);

    #ok("Video metadata stored successfully. Video ID: " # videoId # ". " # Nat.toText(UPLOAD_COST / 100_000_000) # " VI tokens consumed.")
  };

  // Get video metadata by ID
  public query func getVideoMetadata(videoId: Text): async ?VideoMetadata {
    videoMetadata.get(videoId)
  };

  // List all videos (paginated)
  public query func listVideos(limit: Nat, offset: Nat): async [VideoMetadata] {
    let allVideos = Iter.toArray(videoMetadata.vals());
    let sortedVideos = Array.sort(allVideos, func(a: VideoMetadata, b: VideoMetadata): { #less; #equal; #greater } {
      if (a.uploadTime > b.uploadTime) #less
      else if (a.uploadTime < b.uploadTime) #greater
      else #equal
    });
    
    let totalVideos = sortedVideos.size();
    if (offset >= totalVideos) {
      return [];
    };
    
    let endIndex = Nat.min(offset + limit, totalVideos);
    Array.subArray(sortedVideos, offset, endIndex - offset)
  };

  // Get videos by uploader
  public query func getVideosByUploader(uploader: Principal, limit: Nat): async [VideoMetadata] {
    let allVideos = Iter.toArray(videoMetadata.vals());
    let userVideos = Array.filter(allVideos, func(video: VideoMetadata): Bool {
      Principal.equal(video.uploader, uploader)
    });
    
    let sortedVideos = Array.sort(userVideos, func(a: VideoMetadata, b: VideoMetadata): { #less; #equal; #greater } {
      if (a.uploadTime > b.uploadTime) #less
      else if (a.uploadTime < b.uploadTime) #greater
      else #equal
    });
    
    let endIndex = Nat.min(limit, sortedVideos.size());
    Array.subArray(sortedVideos, 0, endIndex)
  };

  // Get total stats
  public query func getStats(): async { totalVideos: Nat; uploadCost: Nat; testnetGiftAmount: Nat } {
    {
      totalVideos = videoMetadata.size();
      uploadCost = UPLOAD_COST;
      testnetGiftAmount = TESTNET_GIFT_AMOUNT;
    }
  };

  // Get current VI token canister ID
  public query func getVITokenCanisterId(): async ?Principal {
    viTokenCanisterId
  };
}