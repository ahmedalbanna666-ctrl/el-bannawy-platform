import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- NestJS guard requires class even for simple AuthGuard wrappers
export class GoogleAuthGuard extends AuthGuard("google") {}
