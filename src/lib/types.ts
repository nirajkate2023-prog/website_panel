export type SessionInfo = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  whiteLabelName: string | null;
  masterName: string | null;
};

export type ClientOption = {
  id: string;
  code: string;
  username: string;
  displayName: string;
};
