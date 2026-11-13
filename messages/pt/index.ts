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

/** One file per area of the site; the key is the namespace (t = useTranslations("booking")). */
const messages = { common, nav, meta, enums, home, paraChefs, support, search, chef, booking, auth, account, dashboard, emails, legal, errors };

export default messages;
