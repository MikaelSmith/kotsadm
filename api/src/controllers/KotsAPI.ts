import { Controller, Put, Post, BodyParams, Req } from "@tsed/common";
import { MultipartFile } from "@tsed/multipartfiles";
import { Request } from "express";
import { putObject } from "../util/s3";
import { Params } from "../server/params";
import path from "path";
import fs from "fs";

interface CreateAppBody {
  metadata: string;
}

interface UpdateAppBody {
  slug: string;
}

@Controller("/api/v1/kots")
export class KotsAPI {
  @Post("/")
  async kotsUploadCreate(
    @MultipartFile("file") file: Express.Multer.File,
    @BodyParams("") body: CreateAppBody,
    @Req() request: Request,
  ): Promise<any> {
    const kotsApp = await request.app.locals.stores.kotsAppStore.createKotsApp(JSON.parse(body.metadata).name);

    const params = await Params.getParams();
    const objectStorePath = path.join(params.shipOutputBucket.trim(), kotsApp.id, "0.tar.gz");
    const buffer = fs.readFileSync(file.path);
    await putObject(params, objectStorePath, buffer, params.shipOutputBucket);

    await request.app.locals.stores.kotsAppStore.createKotsAppVersion(kotsApp.id, 0, "----");

    return {
      uri: `${params.shipApiEndpoint}/app/${kotsApp.slug}`,
    };
  }

  @Put("/")
  async kotsUploadUpdate(
    @MultipartFile("file") file: Express.Multer.File,
    @BodyParams("") body: UpdateAppBody,
  ): Promise<any> {

    // body.slug is the slug of the app to update

    // file.filename is a locally-stored (need to read it) copy of the archive

    // this should create the application in pg
    // upload the version to s3
    // create a version in pg

    // return the url for the app

    return {
      uri: "https://www.google.com",
    };
  }
}