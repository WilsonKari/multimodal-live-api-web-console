export interface ChatFilterConfig {
  followerRole: {
    noFollow: boolean;
    follower: boolean;
    friend: boolean;
  };
  userStatus: {
    moderator: boolean;
    subscriber: boolean;
    newDonor: boolean;
  };
  donorRange: {
    unrestricted: boolean;
    min: number;
    max: number;
  };
} 