import { Context } from "../../context";
import { Stores } from "../../schema/stores";

export function LicenseMutations(stores: Stores) {
  return {
    async syncWatchLicense(root: any, { watchId, licenseId }, context: Context) {
      return await stores.licenseStore.syncWatchLicense(watchId, licenseId);
    },
  }
}
