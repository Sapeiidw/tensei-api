import { auth, permission, role } from "@tensei/auth";
import { rest } from "@tensei/rest";
import { cms } from "@tensei/cms";
import {
  welcome,
  tensei,
  cors,
  resource,
  text,
  hasMany,
  belongsTo,
  route,
  json,
  slug,
  number,
  integer,
  float,
  dateTime,
} from "@tensei/core";
import { media, file, files } from "@tensei/media";
import { smtp } from "@tensei/mail";
export default tensei()
  .root(__dirname)
  .mailer("transactional")
  .plugins([
    media().plugin(),
    welcome(),
    smtp("transactional")
      .auth({
        type: "login",
        user: "5adb52a34b8fd0",
        pass: "99c2a3e4b3a0e4",
      })
      .port(2525)
      .host("smtp.mailtrap.io")
      .plugin(),
    auth()
      .teams()
      .teamPermissions([permission("Read Store")])
      .setup(({ user }) => {
        user.fields([hasMany("Store")]);
      })

      .afterRegister((ctx, payload) => {
        payload.assignRole("Owner");
        // ctx.mailer.send((message) => {
        //   message
        //     .from("hey@myapp.com")
        //     .to(payload.email)
        //     .html("<p>We're glad to have you on our app. Welcome!</p>");
        // });
      })
      .verifyEmails()
      .refreshTokens()
      .roles([
        role("Owner").permissions([
          permission("Create Store"),
          permission("Update Store"),
          permission("Read Store"),
          permission("Delete Store"),
        ]),
      ])
      .social("google", {
        key: "890956978827-rjr950vvvomd1se8krj2r2u4blmd5p1r.apps.googleusercontent.com",
        secret: "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",
        clientCallback: "http://127.0.0.1:3000/login",
      })
      .social("github", {
        key: "cbfbbfb445c8483ba2e2",
        secret: "22f13d8c7ba1a1e27ac53c8cf330f0c7b55ea9f5",
        clientCallback: "http://127.0.0.1:3000/login",
      })
      .plugin(),
    rest().plugin(),
    cms().plugin(),
    cors(),
  ])
  .resources([
    resource("Store")
      .canFetch(({ authUser }) => authUser?.hasPermission("Read Store"))
      .canCreate(({ authUser }) => authUser?.hasPermission("Create Store"))
      .canUpdate(({ authUser }) => authUser?.hasPermission("Read Store"))
      .canDelete(({ authUser }) => authUser?.hasPermission("Delete Store"))
      .fields([
        text("name").rules("required", "unique:name"),
        belongsTo("User").rules("required"),
        hasMany("Product"),
      ]),
    resource("Product")
      .beforeCreate(async ({ em, entity }) => {
        if (
          await em.findOne("Product", {
            name: {
              $eq: entity.name,
            },
            store: {
              $eq: entity.store,
            },
          })
        ) {
          let err = {
            message: "Validation failed.",
            errors: [
              {
                message: "This name has already been taken.",
                validation: "unique",
                field: "name",
              },
            ],
          };
          throw err;
        }
      })
      .fields([
        text("name").creationRules("required", "min:3").updateRules(),
        float("price").creationRules("required").updateRules(),
        integer("qty").rules("number").default(0),
        file("image"),
        belongsTo("Store").creationRules("required").updateRules(),
        hasMany("Category"),
        hasMany("Inventory"),
      ]),
    resource("Receipt").fields([
      json("product").rules("required"),
      integer("total").min(0).rules("required"),
      integer("payment").min(0).rules("required"),
      integer("change").min(0).rules("required"),
      integer("discount").rules("required"),
    ]),
    resource("Inventory").fields([
      text("type").rules("required", "min:1", "max:3"),
      integer("qty").min(1).rules("required"),
      float("price").min(0).rules("required"),
      text("description").rules("max:500"),
      belongsTo("Product").rules("required"),
    ]),
    resource("Category").fields([text("name"), hasMany("Product")]),
  ])
  .start()
  .catch(console.error);
