import type { AppMessages } from "..";
import common from "./common.json";
import nav from "./nav.json";
import meta from "./meta.json";
import enums from "./enums.json";
import home from "./home.json";
import paraChefs from "./paraChefs.json";
import support from "./support.json";
import search from "./search.json";
import chef from "./chef.json";
import booking from "./booking.json";
import auth from "./auth.json";
import account from "./account.json";
import dashboard from "./dashboard.json";
import emails from "./emails.json";
import legal from "./legal.json";
import errors from "./errors.json";

// Typed as the Portuguese messages: a key missing in English is a type error.
const messages: AppMessages = { common, nav, meta, enums, home, paraChefs, support, search, chef, booking, auth, account, dashboard, emails, legal, errors };

export default messages;
