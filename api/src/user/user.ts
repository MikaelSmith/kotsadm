import * as bcrypt from "bcrypt";
import { ReplicatedError } from "../server/errors";

export class User {
  public id: string
  public createdAt: string;

  public githubUser?: GitHubUser;
  public shipUser?: ShipUser;

  public async validatePassword(password: string): Promise<boolean> {
    if (!this.shipUser) {
      throw new ReplicatedError("cannot validate password for external account");
    }

    return bcrypt.compare(password, this.shipUser.passwordCrypt);
  }
};

export interface GitHubUser {
  login: string;
  githubId: number;
  avatarUrl: string;
  email: string;
}

export interface ShipUser {
  firstName: string;
  lastName: string;
  email: string;
  passwordCrypt: string;
}