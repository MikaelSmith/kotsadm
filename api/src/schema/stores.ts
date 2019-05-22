import { SessionStore } from "../session/session_store";
import { UserStore } from "../user";
import { ClusterStore } from "../cluster";
import { WatchStore } from "../watch/watch_store";
import { NotificationStore } from "../notification/store";
import { UpdateStore } from "../update/update_store";
import { UnforkStore } from "../unfork/unfork_store";
import { InitStore } from "../init/init_store";
import { ImageWatchStore } from "../imagewatch/imagewatch_store";
import { FeatureStore } from "../feature/feature_store";
import { GithubNonceStore, UserStoreOld } from "../user/store";
import { HealthzStore } from "../healthz/store";
import { WatchDownload } from "../watch/download";
import { EditStore } from "../edit";
import { PendingStore } from "../pending";

export interface Stores {
  sessionStore: SessionStore;
  userStore: UserStore;
  userStoreOld: UserStoreOld
  githubNonceStore: GithubNonceStore;
  clusterStore: ClusterStore;
  watchStore: WatchStore,
  notificationStore: NotificationStore,
  updateStore: UpdateStore,
  unforkStore: UnforkStore,
  initStore: InitStore,
  pendingStore: PendingStore,
  imageWatchStore: ImageWatchStore,
  featureStore: FeatureStore,
  healthzStore: HealthzStore,
  watchDownload: WatchDownload,
  editStore: EditStore,
}