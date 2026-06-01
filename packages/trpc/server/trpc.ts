import { initTRPC, TRPCError } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";

import { createContext } from "./context";
import { userService } from "./services";
import { getAuthenticationCookie } from "./utils/cookie";

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createContext>()
  .create({});

export const router = tRPCContext.router;

export const publicProcedure = tRPCContext.procedure;

export const protectedProcedure = tRPCContext.procedure.use(async ({ ctx, next }) => {

  const userToken = getAuthenticationCookie(ctx);
  if (!userToken) throw new Error("User is not logged in");

  const { id } = await userService.verifyAndDecodeUserToken(userToken);

  return next({
    ctx: {
      ...ctx,
      user: { id },
    }
  })

});
