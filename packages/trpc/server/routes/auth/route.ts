import { userService } from "../../services";
import { protectedProcedure, publicProcedure, router } from "../../trpc";
import { getAuthenticationCookie, setAuthenticationCookie } from "../../utils/cookie";
import { generatePath } from "../../utils/path-generator";
import { createUserWithEmailAndPasswordInputModel, createUserWithEmailAndPasswordOutputModel, getLoggedInUserInfoInputModel, getLoggedInUserInfoOutputModel, signInUserWithEmailAndPasswordInputModel, signInUserWithEmailAndPasswordOutputModel } from "./model";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");

export const authRouter = router({

  // create user with email and password
  createUserWithEmailAndPassword: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/createUserWithEmailAndPassword"),
        tags: TAGS,
      }
    }).input(createUserWithEmailAndPasswordInputModel)
    .output(createUserWithEmailAndPasswordOutputModel)
    .mutation(async ({ input, ctx }) => {
      const { fullName, email, password } = input;
      const { id, token } = await userService.createUserWithEmailAndPassword({ fullName, email, password });

      setAuthenticationCookie(ctx, token);
      return { id };
    }),

  // sign in user with email and password
  signInUserWithEmailAndPassword: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/signInUserWithEmailAndPassword"),
        tags: TAGS,
      }
    })
    .input(signInUserWithEmailAndPasswordInputModel)
    .output(signInUserWithEmailAndPasswordOutputModel)
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;
      const { id, token } = await userService.signInUserWithEmailAndPassword({ email, password });

      setAuthenticationCookie(ctx, token);
      return { id };
    }),

  // get logged in user info
  getLoggedInUserInfo: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/getLoggedInUserInfo"),
        tags: TAGS,
        protect: true
      }
    })
    .input(getLoggedInUserInfoInputModel)
    .output(getLoggedInUserInfoOutputModel)
    .query(async ({ ctx }) => {
      const { id, fullName, email, profileImageUrl } = await userService.getUserInfoById(ctx.user.id);
      return { id, fullName, email, profileImageUrl };
    })

});
