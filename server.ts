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
  // .databaseConfig({
  //   type: "postgresql", // or postgresql / sqlite / mongodb /mysql
  //   // host: "ec2-3-227-68-43.compute-1.amazonaws.com",
  //   dbName: "d85r1rhffdbgod",
  //   user: "nseqipepuigxqy",
  //   port: 5432,
  //   password:
  //     "0ee7c11cbbe4023b241f88442a000fcdd7da8d3080921855108975b3d4849164",
  // })
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
      .afterRegister((ctx, payload) => {
        payload.assignRole("Owner");
      })
      .verifyEmails()
      .refreshTokens()
      .roles([
        role("Owner").permissions([
          permission("Create Store"),
          permission("Update Store"),
          permission("Read Store"),
          permission("Delete Store"),
          permission("Create Product"),
          permission("Update Product"),
          permission("Read Product"),
          permission("Delete Product"),
          permission("Create Transaction"),
          permission("Update Transaction"),
          permission("Read Transaction"),
          permission("Delete Transaction"),
          permission("Create Receipt"),
          permission("Update Receipt"),
          permission("Read Receipt"),
          permission("Delete Receipt"),
        ]),
      ])
      .plugin(),
    rest().plugin(),
    cors(),
  ])
  .resources([
    resource("Store")
      .canFetch(({ authUser }) => authUser?.hasPermission("Read Store"))
      .canCreate(({ authUser }) => authUser?.hasPermission("Create Store"))
      .canDelete(({ authUser }) => authUser?.hasPermission("Delete Store"))
      .canUpdate(({ authUser, body }) => {
        return authUser?.hasPermission("Read Store"), body.user === authUser.id;
      })
      .fields([
        text("name").rules("required", "unique:name"),
        text("address").rules("max:50"),
        belongsTo("User").rules("required"),
        hasMany("Product"),
      ]),
    resource("Product")
      .canFetch(({ authUser }) => authUser?.hasPermission("Read Product"))
      .canCreate(({ authUser }) => authUser?.hasPermission("Create Product"))
      .canDelete(({ authUser }) => authUser?.hasPermission("Delete Product"))
      .canUpdate(({ authUser }) => authUser?.hasPermission("Read Product"))
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
        integer("qty").rules("number").default(0),
        float("sellPrice").creationRules("required").updateRules(),
        float("discount").rules("number"),
        belongsTo("Store").creationRules("required").updateRules(),
        hasMany("Category"),
        hasMany("Transactions"),
      ]),
    resource("Receipt")
      .canFetch(({ authUser }) => authUser?.hasPermission("Read Receipt"))
      .canCreate(({ authUser }) => authUser?.hasPermission("Create Receipt"))
      .canDelete(({ authUser }) => authUser?.hasPermission("Delete Receipt"))
      .canUpdate(({ authUser }) => authUser?.hasPermission("Read Receipt"))
      .fields([
        json("store").rules("required"),
        json("product").rules("required"),
        integer("total").min(0).rules("required"),
        integer("payment").min(0).rules("required"),
        integer("change").min(0).rules("required"),
        float("discount").rules("number"),
      ]),
    resource("Transactions")
      .canFetch(({ authUser }) => authUser?.hasPermission("Read Transaction"))
      .canCreate(({ authUser }) =>
        authUser?.hasPermission("Create Transaction")
      )
      .canDelete(({ authUser }) =>
        authUser?.hasPermission("Delete Transaction")
      )
      .canUpdate(({ authUser }) => authUser?.hasPermission("Read Transaction"))
      .fields([
        text("type").rules("required", "min:1", "max:3"),
        integer("qty").min(1).rules("required"),
        float("price").min(0).rules("required"),
        float("discount").rules("number"),
        text("description").rules("max:500"),
        belongsTo("Product").rules("required"),
      ]),
    resource("Category").fields([text("name"), hasMany("Product")]),
  ])
  .start()
  .catch(console.error);
